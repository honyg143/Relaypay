import React from 'react';
import { createRoot } from 'react-dom/client';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { aevumTestnet } from './config.js';
import { DraftProvider } from './lib.jsx';
import App from './App.jsx';
import './styles.css';

const config = createConfig({
  chains: [aevumTestnet],
  connectors: [injected()],
  transports: {
    [aevumTestnet.id]: http('https://rpc-test.qday.info'),
  },
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <DraftProvider>
          <App />
        </DraftProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
