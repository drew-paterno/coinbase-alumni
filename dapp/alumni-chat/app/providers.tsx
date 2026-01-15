'use client';

import { baseSepolia } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { MiniAppIndicator } from "./providers/miniAppIndicator";
import { MiniAppProvider } from "./providers/miniAppProvider";
import { WagmiProvider, createConfig, http } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Alumni Chat',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    // Use Coinbase's public RPC for better reliability
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MiniAppProvider>
      <MiniAppIndicator />
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <OnchainKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
            chain={baseSepolia}
            config={{
              appearance: {
                mode: 'auto',
              },
            }}
          >
            {children}
          </OnchainKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </MiniAppProvider>
  );
}
