// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PayRelay} from "../src/PayRelay.sol";
import {MockUSD8} from "./MockUSD8.sol";

/// @notice Minimal cheatcode interface, so the test suite runs with a plain
///         `forge test` and no external libraries to install first.
interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function expectRevert() external;
}

contract PayRelayTest {
    Vm internal constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    address internal constant OWNER = address(0x1001);
    address internal constant AGENT = address(0x1002);
    address internal constant R1 = address(0x2001);
    address internal constant R2 = address(0x2002);
    address internal constant STRANGER = address(0x3001);

    MockUSD8 internal token;
    PayRelay internal relay;

    function setUp() public {
        token = new MockUSD8();
        relay = new PayRelay(address(token));
        token.mint(OWNER, 10_000e6);
        vm.prank(OWNER);
        token.approve(address(relay), type(uint256).max);
    }

    // --------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------

    function _batch() internal pure returns (address[] memory recipients, uint256[] memory amounts) {
        recipients = new address[](2);
        recipients[0] = R1;
        recipients[1] = R2;
        amounts = new uint256[](2);
        amounts[0] = 100e6;
        amounts[1] = 50e6;
    }

    function _setAgent(uint256 perBatchCap, uint256 totalCap, uint256 validUntil) internal {
        vm.prank(OWNER);
        relay.setAgent(AGENT, perBatchCap, totalCap, validUntil);
    }

    function _schedule(uint256 dueTime) internal returns (uint256 id) {
        (address[] memory recipients, uint256[] memory amounts) = _batch();
        vm.prank(OWNER);
        id = relay.createBatchSchedule(recipients, amounts, dueTime);
    }

    function assertEq(uint256 a, uint256 b, string memory what) internal pure {
        require(a == b, string(abi.encodePacked("assertEq failed: ", what)));
    }

    function assertEq(address a, address b, string memory what) internal pure {
        require(a == b, string(abi.encodePacked("assertEq failed: ", what)));
    }

    function assertTrue(bool cond, string memory what) internal pure {
        require(cond, string(abi.encodePacked("assertTrue failed: ", what)));
    }

    // --------------------------------------------------------------
    // batchPay
    // --------------------------------------------------------------

    function testBatchPayPaysAllRecipients() public {
        (address[] memory recipients, uint256[] memory amounts) = _batch();
        vm.prank(OWNER);
        uint256 total = relay.batchPay(recipients, amounts);
        assertEq(total, 150e6, "total");
        assertEq(token.balanceOf(R1), 100e6, "r1 balance");
        assertEq(token.balanceOf(R2), 50e6, "r2 balance");
        assertEq(token.balanceOf(OWNER), 10_000e6 - 150e6, "owner balance");
    }

    function testBatchPayRevertsOnLengthMismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = R1;
        recipients[1] = R2;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100e6;
        vm.prank(OWNER);
        vm.expectRevert();
        relay.batchPay(recipients, amounts);
    }

    function testBatchPayRevertsOnZeroAmount() public {
        address[] memory recipients = new address[](1);
        recipients[0] = R1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 0;
        vm.prank(OWNER);
        vm.expectRevert();
        relay.batchPay(recipients, amounts);
    }

    function testBatchPayRevertsOnEmptyBatch() public {
        address[] memory recipients = new address[](0);
        uint256[] memory amounts = new uint256[](0);
        vm.prank(OWNER);
        vm.expectRevert();
        relay.batchPay(recipients, amounts);
    }

    // --------------------------------------------------------------
    // Agent permission
    // --------------------------------------------------------------

    function testSetAgentStoresPermission() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        (address agent, uint256 perBatchCap, uint256 totalCap, uint256 spent, uint256 validUntil) =
            relay.agentInfo(OWNER);
        assertEq(agent, AGENT, "agent");
        assertEq(perBatchCap, 200e6, "per batch cap");
        assertEq(totalCap, 1_000e6, "total cap");
        assertEq(spent, 0, "spent starts at zero");
        assertTrue(validUntil > block.timestamp, "valid until in future");
    }

    function testSetAgentRevertsWhenTotalBelowPerBatch() public {
        vm.prank(OWNER);
        vm.expectRevert();
        relay.setAgent(AGENT, 200e6, 100e6, block.timestamp + 7 days);
    }

    // --------------------------------------------------------------
    // Scheduling
    // --------------------------------------------------------------

    function testCreateScheduleStoresBatch() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        uint256 due = block.timestamp + 1 hours;
        uint256 id = _schedule(due);
        assertEq(id, 0, "first id");
        (address owner, uint256 total, uint256 dueTime, PayRelay.Status status, address[] memory recips,) =
            relay.getSchedule(id);
        assertEq(owner, OWNER, "schedule owner");
        assertEq(total, 150e6, "schedule total");
        assertEq(dueTime, due, "due time");
        assertTrue(status == PayRelay.Status.Pending, "status pending");
        assertEq(recips.length, 2, "recipient count");
        assertEq(relay.scheduleIdsOf(OWNER).length, 1, "owner schedule list");
    }

    function testCreateScheduleRevertsOverPerBatchCap() public {
        _setAgent(100e6, 1_000e6, block.timestamp + 7 days);
        (address[] memory recipients, uint256[] memory amounts) = _batch();
        vm.prank(OWNER);
        vm.expectRevert();
        relay.createBatchSchedule(recipients, amounts, block.timestamp + 1 hours);
    }

    function testCreateScheduleRevertsWithoutAgent() public {
        (address[] memory recipients, uint256[] memory amounts) = _batch();
        vm.prank(OWNER);
        vm.expectRevert();
        relay.createBatchSchedule(recipients, amounts, block.timestamp + 1 hours);
    }

    function testCreateScheduleRevertsWhenPermissionExpiresBeforeDue() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 30 minutes);
        (address[] memory recipients, uint256[] memory amounts) = _batch();
        vm.prank(OWNER);
        vm.expectRevert();
        relay.createBatchSchedule(recipients, amounts, block.timestamp + 1 hours);
    }

    // --------------------------------------------------------------
    // Execution
    // --------------------------------------------------------------

    function testExecuteBeforeDueReverts() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        uint256 id = _schedule(block.timestamp + 1 hours);
        vm.prank(AGENT);
        vm.expectRevert();
        relay.executeBatchSchedule(id);
    }

    function testExecuteByAgentAfterDuePaysAndTracksSpent() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        uint256 due = block.timestamp + 1 hours;
        uint256 id = _schedule(due);
        vm.warp(due + 1);
        vm.prank(AGENT);
        relay.executeBatchSchedule(id);
        assertEq(token.balanceOf(R1), 100e6, "r1 paid");
        assertEq(token.balanceOf(R2), 50e6, "r2 paid");
        (,,, PayRelay.Status status,,) = relay.getSchedule(id);
        assertTrue(status == PayRelay.Status.Executed, "status executed");
        (,, , uint256 spent,) = relay.agentInfo(OWNER);
        assertEq(spent, 150e6, "spent tracked");
    }

    function testNonAgentCannotExecute() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        uint256 due = block.timestamp + 1 hours;
        uint256 id = _schedule(due);
        vm.warp(due + 1);
        vm.prank(STRANGER);
        vm.expectRevert();
        relay.executeBatchSchedule(id);
    }

    function testDoubleExecuteReverts() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        uint256 due = block.timestamp + 1 hours;
        uint256 id = _schedule(due);
        vm.warp(due + 1);
        vm.prank(AGENT);
        relay.executeBatchSchedule(id);
        vm.prank(AGENT);
        vm.expectRevert();
        relay.executeBatchSchedule(id);
    }

    function testTotalCapBlocksSecondExecution() public {
        _setAgent(150e6, 150e6, block.timestamp + 7 days);
        uint256 due = block.timestamp + 1 hours;
        uint256 first = _schedule(due);
        uint256 second = _schedule(due);
        vm.warp(due + 1);
        vm.prank(AGENT);
        relay.executeBatchSchedule(first);
        vm.prank(AGENT);
        vm.expectRevert();
        relay.executeBatchSchedule(second);
    }

    function testExecuteFailsCleanlyWhenAllowanceRemoved() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        uint256 due = block.timestamp + 1 hours;
        uint256 id = _schedule(due);
        vm.prank(OWNER);
        token.approve(address(relay), 0);
        vm.warp(due + 1);
        vm.prank(AGENT);
        relay.executeBatchSchedule(id);
        (,,, PayRelay.Status status,,) = relay.getSchedule(id);
        assertTrue(status == PayRelay.Status.Failed, "status failed");
        assertEq(token.balanceOf(R1), 0, "nothing paid out");
    }

    // --------------------------------------------------------------
    // Cancel and revoke
    // --------------------------------------------------------------

    function testCancelBlocksExecute() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        uint256 due = block.timestamp + 1 hours;
        uint256 id = _schedule(due);
        vm.prank(OWNER);
        relay.cancelSchedule(id);
        vm.warp(due + 1);
        vm.prank(AGENT);
        vm.expectRevert();
        relay.executeBatchSchedule(id);
    }

    function testRevokeBlocksExecute() public {
        _setAgent(200e6, 1_000e6, block.timestamp + 7 days);
        uint256 due = block.timestamp + 1 hours;
        uint256 id = _schedule(due);
        vm.prank(OWNER);
        relay.revokeAgent();
        vm.warp(due + 1);
        vm.prank(AGENT);
        vm.expectRevert();
        relay.executeBatchSchedule(id);
    }

    // --------------------------------------------------------------
    // Runner view
    // --------------------------------------------------------------

    function testDueScheduleIdsListsOnlyDuePending() public {
        _setAgent(500e6, 1_000e6, block.timestamp + 7 days);
        uint256 dueSoon = _schedule(block.timestamp + 1 hours);
        _schedule(block.timestamp + 5 hours);
        assertEq(relay.dueScheduleIds().length, 0, "nothing due yet");
        vm.warp(block.timestamp + 2 hours);
        uint256[] memory due = relay.dueScheduleIds();
        assertEq(due.length, 1, "one due");
        assertEq(due[0], dueSoon, "due id matches");
    }
}
