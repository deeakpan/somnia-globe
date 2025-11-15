/**
 * Somnia Data Streams Integration
 * 
 * This module provides utilities for connecting to Somnia blockchain
 * data streams and processing real-time contract events for volume tracking.
 */

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, decodeEventLog, Abi, keccak256, stringToBytes } from 'viem';

// Define Somnia Dream chain configuration
export const somniaDreamChain = {
  id: 50312,
  name: 'Somnia Dream',
  network: 'somnia-dream',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { 
      http: ['https://dream-rpc.somnia.network'],
      webSocket: ['wss://dream-rpc.somnia.network'] 
    },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://explorer.somnia.network' },
  },
} as const;

export interface Project {
  id: string;
  contract_address: string;
  abi: Abi;
  event_signatures?: string[];
  unique_wallets: number;
  total_transactions: number;
}

export interface EventData {
  projectId: string;
  contractAddress: string;
  eventName: string;
  walletAddress: string;
  blockNumber: bigint;
  transactionHash: string;
  timestamp: Date;
}

// Global SDK instance
let sdkInstance: SDK | null = null;
const activeSubscriptions = new Map<string, { unsubscribe: () => void }>();

/**
 * Initialize Somnia SDK connection
 * Uses WebSocket for subscriptions, HTTP for transactions
 */
export async function initializeSomniaSDK(): Promise<SDK> {
  if (sdkInstance) {
    return sdkInstance;
  }

  const rpcUrl = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
  const wsUrl = process.env.NEXT_PUBLIC_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network';

  // Public client for reading (HTTP)
  const publicClient = createPublicClient({
    chain: somniaDreamChain as any,
    transport: http(rpcUrl),
  });

  // Public client for subscriptions (WebSocket)
  const wsClient = createPublicClient({
    chain: somniaDreamChain as any,
    transport: webSocket(wsUrl),
  });

  // Wallet client (optional, for write operations)
  const walletClient = process.env.PRIVATE_KEY
    ? createWalletClient({
        chain: somniaDreamChain as any,
        transport: http(rpcUrl),
        account: process.env.PRIVATE_KEY as `0x${string}`,
      })
    : undefined;

  sdkInstance = new SDK({
    public: wsClient, // Use WebSocket for subscriptions
    wallet: walletClient,
  });

  return sdkInstance;
}

/**
 * Extract event signatures from ABI
 * Returns array of event signatures (e.g., ["Transfer(address,address,uint256)", "Swap(...)"])
 */
export function extractEventSignatures(abi: Abi): string[] {
  const signatures: string[] = [];
  
  if (!Array.isArray(abi)) return signatures;

  for (const item of abi) {
    if (item.type === 'event' && item.name) {
      const params = item.inputs?.map(input => input.type).join(',') || '';
      signatures.push(`${item.name}(${params})`);
    }
  }

  return signatures;
}

/**
 * Get event topic from signature
 * First topic is keccak256 hash of the event signature
 */
export function getEventTopic(signature: string): `0x${string}` {
  return keccak256(stringToBytes(signature));
}

/**
 * Subscribe to contract events for a project
 * Tracks unique wallets and updates volume in real-time
 */
export async function subscribeToProjectEvents(
  project: Project,
  onEvent: (event: EventData) => Promise<void>
): Promise<{ unsubscribe: () => void }> {
  const sdk = await initializeSomniaSDK();
  const subscriptionKey = project.id;

  // If already subscribed, return existing subscription
  if (activeSubscriptions.has(subscriptionKey)) {
    return activeSubscriptions.get(subscriptionKey)!;
  }

  // Get event signatures from project
  const eventSignatures = project.event_signatures || extractEventSignatures(project.abi);
  
  if (eventSignatures.length === 0) {
    throw new Error(`No events found for project ${project.id}`);
  }

  // Subscribe to each event signature
  const subscriptions = await Promise.all(
    eventSignatures.map(async (eventSig) => {
      const eventTopic = getEventTopic(eventSig);
      
      return sdk.streams.subscribe({
        somniaStreamsEventId: eventSig, // Event signature
        contractAddress: project.contract_address as `0x${string}`,
        onData: async (data) => {
          try {
            // Decode the event
            const decoded = decodeEventLog({
              abi: project.abi,
              topics: data.result.topics,
              data: data.result.data,
            });

            // Extract wallet address from event (usually first indexed parameter)
            // This depends on your event structure - adjust based on common patterns
            let walletAddress: string | undefined;
            
            if (decoded.args) {
              // Try to find address in args (common patterns: from, to, user, account)
              const args = decoded.args as any;
              walletAddress = args.from || args.to || args.user || args.account || args[0];
              
              // If it's an object, try to extract address
              if (typeof walletAddress === 'object' && walletAddress) {
                walletAddress = walletAddress.toString();
              }
            }

            if (!walletAddress || !walletAddress.startsWith('0x')) {
              console.warn(`Could not extract wallet address from event ${eventSig}`);
              return;
            }

            const eventData: EventData = {
              projectId: project.id,
              contractAddress: project.contract_address,
              eventName: decoded.eventName || eventSig,
              walletAddress: walletAddress.toLowerCase(),
              blockNumber: BigInt(data.result.blockNumber || 0),
              transactionHash: data.result.transactionHash || '',
              timestamp: new Date(),
            };

            await onEvent(eventData);
          } catch (error) {
            console.error(`Error processing event for project ${project.id}:`, error);
          }
        },
        onError: (error) => {
          console.error(`Subscription error for project ${project.id}:`, error);
        },
      });
    })
  );

  const unsubscribe = () => {
    subscriptions.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    activeSubscriptions.delete(subscriptionKey);
  };

  activeSubscriptions.set(subscriptionKey, { unsubscribe });

  return { unsubscribe };
}

/**
 * Unsubscribe from all project events
 */
export function unsubscribeAll() {
  activeSubscriptions.forEach(({ unsubscribe }) => unsubscribe());
  activeSubscriptions.clear();
}

/**
 * Get active subscription count
 */
export function getActiveSubscriptionCount(): number {
  return activeSubscriptions.size;
}
