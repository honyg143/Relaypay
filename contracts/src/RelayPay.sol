// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal ERC-20 interface, enough for tUSD8 transfers.
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

/// @title RelayPay
/// @notice Batch stablecoin payments on Aevum Testnet, with scheduled batches
///         executed by an owner-approved agent inside onchain caps.
/// @dev Funding model: for pay-now and scheduled batches, funds stay in the
///      owner's wallet. The owner approves this contract for an allowance,
///      and the contract moves funds with transferFrom. The one exception
///      is RelayDrops: a drop locks its total in this contract as escrow,
///      because claims happen later, one wallet at a time.
///      EVM target is Shanghai (Aevum has no Cancun opcodes).
contract RelayPay {
    uint256 public constant MAX_BATCH = 50;

    IERC20 public immutable token;

    struct AgentPermission {
        address agent;
        uint256 perBatchCap;
        uint256 totalCap;
        uint256 spent;
        uint256 validUntil;
    }

    enum Status {
        Pending,
        Executed,
        Cancelled,
        Failed
    }

    struct Schedule {
        address owner;
        uint256 total;
        uint256 dueTime;
        Status status;
        address[] recipients;
        uint256[] amounts;
    }

    struct Drop {
        address giver;
        uint256 total;
        uint256 claimedTotal;
        uint256 claimDeadline;
        bool closed;
        address[] recipients;
    }

    mapping(address => AgentPermission) private _agents;
    Schedule[] private _schedules;
    mapping(address => uint256[]) private _scheduleIdsOf;
    Drop[] private _drops;
    mapping(address => uint256[]) private _dropIdsOf;
    mapping(uint256 => mapping(address => uint256)) private _allocations;
    mapping(uint256 => mapping(address => bool)) private _claimed;

    event BatchPaid(address indexed owner, uint256 total, uint256 count);
    event AgentSet(
        address indexed owner, address indexed agent, uint256 perBatchCap, uint256 totalCap, uint256 validUntil
    );
    event AgentRevoked(address indexed owner);
    event BatchScheduled(uint256 indexed id, address indexed owner, uint256 total, uint256 count, uint256 dueTime);
    event BatchScheduleExecuted(uint256 indexed id, uint256 total, uint256 count);
    event BatchScheduleFailed(uint256 indexed id, string reason);
    event BatchScheduleCancelled(uint256 indexed id);
    event DropCreated(uint256 indexed id, address indexed giver, uint256 total, uint256 count, uint256 claimDeadline);
    event DropClaimed(uint256 indexed id, address indexed claimer, uint256 amount);
    event DropReclaimed(uint256 indexed id, address indexed giver, uint256 amount);

    constructor(address token_) {
        require(token_ != address(0), "token is zero address");
        token = IERC20(token_);
    }

    // ------------------------------------------------------------------
    // Pay now
    // ------------------------------------------------------------------

    /// @notice Pay a batch of recipients right now, from the caller's funds.
    function batchPay(address[] calldata recipients, uint256[] calldata amounts) external returns (uint256 total) {
        total = _validateBatch(recipients, amounts);
        for (uint256 i = 0; i < recipients.length; i++) {
            require(token.transferFrom(msg.sender, recipients[i], amounts[i]), "transfer failed");
        }
        emit BatchPaid(msg.sender, total, recipients.length);
    }

    // ------------------------------------------------------------------
    // Agent permission (caps live onchain, enforced on every execution)
    // ------------------------------------------------------------------

    /// @notice Set or replace the agent that may execute scheduled batches.
    /// @dev Setting a new permission resets spent to zero.
    function setAgent(address agent, uint256 perBatchCap, uint256 totalCap, uint256 validUntil) external {
        require(agent != address(0), "agent is zero address");
        require(perBatchCap > 0, "per-batch cap is zero");
        require(totalCap >= perBatchCap, "total cap below per-batch cap");
        require(validUntil > block.timestamp, "expiry in the past");
        _agents[msg.sender] = AgentPermission({
            agent: agent,
            perBatchCap: perBatchCap,
            totalCap: totalCap,
            spent: 0,
            validUntil: validUntil
        });
        emit AgentSet(msg.sender, agent, perBatchCap, totalCap, validUntil);
    }

    /// @notice Remove the agent permission. Pending schedules can no longer
    ///         be executed after this.
    function revokeAgent() external {
        require(_agents[msg.sender].agent != address(0), "no agent set");
        delete _agents[msg.sender];
        emit AgentRevoked(msg.sender);
    }

    function agentInfo(address owner)
        external
        view
        returns (address agent, uint256 perBatchCap, uint256 totalCap, uint256 spent, uint256 validUntil)
    {
        AgentPermission memory p = _agents[owner];
        return (p.agent, p.perBatchCap, p.totalCap, p.spent, p.validUntil);
    }

    // ------------------------------------------------------------------
    // Scheduled batches
    // ------------------------------------------------------------------

    /// @notice Store a whole batch onchain to be paid at dueTime by the agent.
    /// @dev Caps are checked here as well, so a schedule that can never be
    ///      executed is not created in the first place.
    function createBatchSchedule(address[] calldata recipients, uint256[] calldata amounts, uint256 dueTime)
        external
        returns (uint256 id)
    {
        require(dueTime > block.timestamp, "due time in the past");
        AgentPermission memory p = _agents[msg.sender];
        require(p.agent != address(0), "no agent set");
        require(p.validUntil >= dueTime, "permission expires before due time");

        uint256 total = _validateBatch(recipients, amounts);
        require(total <= p.perBatchCap, "over per-batch cap");
        require(p.spent + total <= p.totalCap, "over total cap");

        id = _schedules.length;
        Schedule storage s = _schedules.push();
        s.owner = msg.sender;
        s.total = total;
        s.dueTime = dueTime;
        s.status = Status.Pending;
        s.recipients = recipients;
        s.amounts = amounts;
        _scheduleIdsOf[msg.sender].push(id);

        emit BatchScheduled(id, msg.sender, total, recipients.length, dueTime);
    }

    /// @notice Execute a due scheduled batch. Only the owner's agent may call.
    /// @dev Caps and expiry are re-checked here, the runner is never trusted.
    ///      If the owner no longer has the balance or allowance, the schedule
    ///      is marked Failed with a reason instead of paying partially.
    function executeBatchSchedule(uint256 id) external {
        require(id < _schedules.length, "unknown schedule");
        Schedule storage s = _schedules[id];
        require(s.status == Status.Pending, "not pending");
        require(block.timestamp >= s.dueTime, "not due yet");

        AgentPermission storage p = _agents[s.owner];
        require(p.agent != address(0) && msg.sender == p.agent, "not the agent");
        require(block.timestamp <= p.validUntil, "permission expired");
        require(s.total <= p.perBatchCap, "over per-batch cap");
        require(p.spent + s.total <= p.totalCap, "over total cap");

        if (token.balanceOf(s.owner) < s.total || token.allowance(s.owner, address(this)) < s.total) {
            s.status = Status.Failed;
            emit BatchScheduleFailed(id, "insufficient balance or allowance");
            return;
        }

        for (uint256 i = 0; i < s.recipients.length; i++) {
            require(token.transferFrom(s.owner, s.recipients[i], s.amounts[i]), "transfer failed");
        }
        p.spent += s.total;
        s.status = Status.Executed;
        emit BatchScheduleExecuted(id, s.total, s.recipients.length);
    }

    /// @notice Cancel a pending schedule. Only its owner may call.
    function cancelSchedule(uint256 id) external {
        require(id < _schedules.length, "unknown schedule");
        Schedule storage s = _schedules[id];
        require(s.owner == msg.sender, "not the owner");
        require(s.status == Status.Pending, "not pending");
        s.status = Status.Cancelled;
        emit BatchScheduleCancelled(id);
    }

    // ------------------------------------------------------------------
    // RelayDrops (escrow drops with a claim page)
    // ------------------------------------------------------------------

    /// @notice Create a drop: the total is locked in this contract as
    ///         escrow, and each listed recipient can claim their amount
    ///         once, before the claim deadline.
    /// @dev Duplicate recipients are rejected: one wallet, one allocation.
    function createDrop(address[] calldata recipients, uint256[] calldata amounts, uint256 claimDeadline)
        external
        returns (uint256 id)
    {
        require(claimDeadline > block.timestamp, "claim deadline in the past");
        uint256 total = _validateBatch(recipients, amounts);
        for (uint256 i = 0; i < recipients.length; i++) {
            for (uint256 j = i + 1; j < recipients.length; j++) {
                require(recipients[i] != recipients[j], "duplicate recipient");
            }
        }

        require(token.transferFrom(msg.sender, address(this), total), "escrow transfer failed");

        id = _drops.length;
        Drop storage d = _drops.push();
        d.giver = msg.sender;
        d.total = total;
        d.claimedTotal = 0;
        d.claimDeadline = claimDeadline;
        d.closed = false;
        d.recipients = recipients;
        for (uint256 i = 0; i < recipients.length; i++) {
            _allocations[id][recipients[i]] = amounts[i];
        }
        _dropIdsOf[msg.sender].push(id);

        emit DropCreated(id, msg.sender, total, recipients.length, claimDeadline);
    }

    /// @notice Claim your amount from a drop. Only a listed wallet, only
    ///         once, only before the claim deadline.
    function claim(uint256 id) external {
        require(id < _drops.length, "unknown drop");
        Drop storage d = _drops[id];
        require(!d.closed, "drop closed");
        require(block.timestamp <= d.claimDeadline, "claim deadline passed");
        uint256 amount = _allocations[id][msg.sender];
        require(amount > 0, "not on the list");
        require(!_claimed[id][msg.sender], "already claimed");

        _claimed[id][msg.sender] = true;
        d.claimedTotal += amount;
        require(token.transfer(msg.sender, amount), "claim transfer failed");
        emit DropClaimed(id, msg.sender, amount);
    }

    /// @notice After the claim deadline, the giver takes back whatever was
    ///         not claimed, and the drop closes.
    function reclaimUnclaimed(uint256 id) external returns (uint256 remaining) {
        require(id < _drops.length, "unknown drop");
        Drop storage d = _drops[id];
        require(d.giver == msg.sender, "not the giver");
        require(!d.closed, "drop closed");
        require(block.timestamp > d.claimDeadline, "claim deadline not passed");

        remaining = d.total - d.claimedTotal;
        d.closed = true;
        if (remaining > 0) {
            require(token.transfer(msg.sender, remaining), "reclaim transfer failed");
        }
        emit DropReclaimed(id, msg.sender, remaining);
    }

    // ------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------

    function getSchedule(uint256 id)
        external
        view
        returns (
            address owner,
            uint256 total,
            uint256 dueTime,
            Status status,
            address[] memory recipients,
            uint256[] memory amounts
        )
    {
        require(id < _schedules.length, "unknown schedule");
        Schedule storage s = _schedules[id];
        return (s.owner, s.total, s.dueTime, s.status, s.recipients, s.amounts);
    }

    function scheduleIdsOf(address owner) external view returns (uint256[] memory) {
        return _scheduleIdsOf[owner];
    }

    function scheduleCount() external view returns (uint256) {
        return _schedules.length;
    }

    /// @notice Ids of schedules that are pending and due, for the runner.
    function dueScheduleIds() external view returns (uint256[] memory due) {
        uint256 count = 0;
        for (uint256 i = 0; i < _schedules.length; i++) {
            if (_schedules[i].status == Status.Pending && _schedules[i].dueTime <= block.timestamp) {
                count++;
            }
        }
        due = new uint256[](count);
        uint256 j = 0;
        for (uint256 i = 0; i < _schedules.length; i++) {
            if (_schedules[i].status == Status.Pending && _schedules[i].dueTime <= block.timestamp) {
                due[j] = i;
                j++;
            }
        }
    }

    function getDrop(uint256 id)
        external
        view
        returns (
            address giver,
            uint256 total,
            uint256 claimedTotal,
            uint256 claimDeadline,
            bool closed,
            address[] memory recipients
        )
    {
        require(id < _drops.length, "unknown drop");
        Drop storage d = _drops[id];
        return (d.giver, d.total, d.claimedTotal, d.claimDeadline, d.closed, d.recipients);
    }

    function dropIdsOf(address giver) external view returns (uint256[] memory) {
        return _dropIdsOf[giver];
    }

    function dropCount() external view returns (uint256) {
        return _drops.length;
    }

    function allocationOf(uint256 id, address wallet) external view returns (uint256) {
        return _allocations[id][wallet];
    }

    function hasClaimed(uint256 id, address wallet) external view returns (bool) {
        return _claimed[id][wallet];
    }

    // ------------------------------------------------------------------
    // Internal
    // ------------------------------------------------------------------

    function _validateBatch(address[] calldata recipients, uint256[] calldata amounts)
        internal
        pure
        returns (uint256 total)
    {
        require(recipients.length == amounts.length, "length mismatch");
        require(recipients.length > 0, "empty batch");
        require(recipients.length <= MAX_BATCH, "batch too large");
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "recipient is zero address");
            require(amounts[i] > 0, "amount is zero");
            total += amounts[i];
        }
    }
}
