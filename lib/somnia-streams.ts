/**
 * Somnia Data Streams Integration
 * 
 * This module provides utilities for connecting to Somnia blockchain
 * data streams and processing real-time contract events for volume tracking.
 */

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, decodeEventLog, Abi, keccak256, stringToBytes, Hex } from 'viem';

// Type for subscription return value
type SubscriptionReturnType = {
  subscriptionId: Hex;
  unsubscribe: () => Promise<{ jsonrpc: string; id: number; result?: boolean; error?: any }>;
};

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
const pollingIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Initialize Somnia SDK connection
 * Uses WebSocket for subscriptions, HTTP for transactions
 */
export async function initializeSomniaSDK(): Promise<SDK> {
  if (sdkInstance) {
    return sdkInstance;
  }

  // Try different env var names for flexibility
  const rpcUrl = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || 
                 process.env.SOMNIA_RPC_TESTNET || 
                 'https://dream-rpc.somnia.network';
  
  // WebSocket URL - try to derive from HTTP URL if not explicitly set
  // Some RPCs use the same domain but different protocol/path
  let wsUrl = process.env.NEXT_PUBLIC_SOMNIA_WS_URL || process.env.SOMNIA_WS_URL;
  
  if (!wsUrl) {
    // Try to derive WebSocket URL from HTTP URL
    const httpUrl = rpcUrl.replace('https://', '').replace('http://', '').replace(/\/$/, '');
    // Try common WebSocket URL patterns
    wsUrl = `wss://${httpUrl}`;
    console.log(`⚠️  WebSocket URL not set, trying: ${wsUrl}`);
    console.log(`   If this fails, set NEXT_PUBLIC_SOMNIA_WS_URL or SOMNIA_WS_URL in .env`);
  }

  console.log(`🔌 Connecting to Somnia RPC: ${rpcUrl}`);
  console.log(`🔌 Connecting to Somnia WebSocket: ${wsUrl}`);

  // SDK requires WebSocket-capable transport
  // Try WebSocket first, but the connection might fail initially - SDK may handle reconnection
  let publicClient;
  try {
    console.log('📡 Creating WebSocket client (required by SDK)...');
    console.log(`   WebSocket URL: ${wsUrl}`);
    
    // Create WebSocket transport - errors during creation are OK, SDK may handle connection later
    const wsTransport = webSocket(wsUrl);
    
    publicClient = createPublicClient({
      chain: somniaDreamChain as any,
      transport: wsTransport,
    });
    
    console.log('✅ WebSocket client created (connection may be established later by SDK)');
  } catch (error) {
    console.error('❌ Failed to create WebSocket client:', error);
    // Don't throw - let SDK try to handle it
    throw error;
  }

  // Wallet client (optional, for write operations)
  const walletClient = process.env.PRIVATE_KEY
    ? createWalletClient({
        chain: somniaDreamChain as any,
        transport: http(rpcUrl),
        account: process.env.PRIVATE_KEY as `0x${string}`,
      })
    : undefined;

  sdkInstance = new SDK({
    public: publicClient as any, // Type assertion needed due to WebSocket transport type mismatch
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
      const params = item.inputs?.map((input: any) => input.type).join(',') || '';
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
 * Poll for events using HTTP (fallback when WebSocket fails)
 * Uses viem's getLogs to poll for contract events
 */
async function pollForEventsHTTP(
  project: Project,
  onEvent: (event: EventData) => Promise<void>
): Promise<{ unsubscribe: () => void }> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOMNIA_RPC_URL || 
                 process.env.SOMNIA_RPC_TESTNET || 
                 'https://dream-rpc.somnia.network';
  
  const httpClient = createPublicClient({
    chain: somniaDreamChain as any,
    transport: http(rpcUrl),
  });

  const contractAddress = project.contract_address as `0x${string}`;
  const eventSignatures = project.event_signatures || extractEventSignatures(project.abi);
  let lastBlockNumber = await httpClient.getBlockNumber();
  
  console.log(`📡 Starting HTTP polling for project ${project.id} (starting from block ${lastBlockNumber})`);

  const interval = setInterval(async () => {
    try {
      const currentBlock = await httpClient.getBlockNumber();
      const lastBlockNum = BigInt(Number(lastBlockNumber));
      const currentBlockNum = BigInt(Number(currentBlock));
      
      if (currentBlockNum > lastBlockNum) {
        // Get logs for all events
        for (const eventSig of eventSignatures) {
          const eventTopic = getEventTopic(eventSig);
          
          try {
            // Find the event in the ABI to use with getLogs
            const eventAbi = project.abi.find((item: any) => 
              item.type === 'event' && item.name === eventSig.split('(')[0]
            );
            
            if (!eventAbi) {
              console.warn(`Event ${eventSig} not found in ABI`);
              continue;
            }
            
            // Get logs using the event definition from ABI
            const logs = await httpClient.getLogs({
              address: contractAddress,
              event: eventAbi as any,
              fromBlock: BigInt(Number(lastBlockNum) + 1),
              toBlock: currentBlockNum,
            });

            for (const log of logs) {
              try {
                const decoded = decodeEventLog({
                  abi: project.abi,
                  topics: log.topics,
                  data: log.data,
                });

                let walletAddress: string | undefined;
                if (decoded.args) {
                  const args = decoded.args as any;
                  walletAddress = args.from || args.to || args.user || args.account || args.player || args[0];
                  if (typeof walletAddress === 'object' && walletAddress !== null) {
                    walletAddress = String(walletAddress);
                  }
                }

                if (walletAddress && typeof walletAddress === 'string' && walletAddress.startsWith('0x')) {
                  const eventData: EventData = {
                    projectId: project.id,
                    contractAddress: project.contract_address,
                    eventName: decoded.eventName || eventSig,
                    walletAddress: walletAddress.toLowerCase(),
                    blockNumber: log.blockNumber || BigInt(0),
                    transactionHash: log.transactionHash || '',
                    timestamp: new Date(),
                  };
                  await onEvent(eventData);
                } else {
                  console.warn(`⚠️ Could not extract wallet address from event ${decoded.eventName || eventSig}. Args:`, decoded.args);
                }
              } catch (error) {
                console.error(`Error decoding log:`, error);
              }
            }
          } catch (error) {
            console.error(`Error fetching logs for ${eventSig}:`, error);
          }
        }
        
        lastBlockNumber = currentBlockNum;
      }
    } catch (error) {
      console.error(`Error in HTTP polling:`, error);
    }
  }, 3000); // Poll every 3 seconds

  pollingIntervals.set(project.id, interval);

  return {
    unsubscribe: () => {
      if (interval) {
        clearInterval(interval);
        pollingIntervals.delete(project.id);
      }
    },
  };
}

/**
 * Subscribe to contract events for a project
 * Tracks unique wallets and updates volume in real-time
 */
export async function subscribeToProjectEvents(
  project: Project,
  onEvent: (event: EventData) => Promise<void>
): Promise<{ unsubscribe: () => void }> {
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

  // Try WebSocket subscription first
  try {
    const sdk = await initializeSomniaSDK();
    
    // Subscribe to each event signature
    const subscriptionResults = await Promise.allSettled(
    eventSignatures.map(async (eventSig) => {
      const eventTopic = getEventTopic(eventSig);
      
      // Wrap subscription in try-catch to handle WebSocket connection errors gracefully
      let result;
      try {
        result = await sdk.streams.subscribe({
          somniaStreamsEventId: eventSig, // Event signature
          eventContractSources: [project.contract_address as `0x${string}`], // Contract addresses to listen to
          topicOverrides: [eventTopic], // Event topic (keccak256 hash of signature)
          ethCalls: [], // No additional ETH calls needed
          onlyPushChanges: false, // Push all events, not just changes
          onData: async (data: any) => {
            try {
              console.log(`📨 Event received: ${eventSig} for project ${project.id}`);
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
                // Try to find address in args (common patterns: from, to, user, account, player)
                const args = decoded.args as any;
                walletAddress = args.from || args.to || args.user || args.account || args.player || args[0];
                
                // If it's an object, try to extract address
                if (typeof walletAddress === 'object' && walletAddress !== null) {
                  walletAddress = String(walletAddress);
                }
              }

              if (!walletAddress || typeof walletAddress !== 'string' || !walletAddress.startsWith('0x')) {
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
          onError: (error: Error) => {
            // Only log critical errors - WebSocket connection errors might be non-critical
            const errorMsg = error.message || String(error);
            if (!errorMsg.includes('non-101') && !errorMsg.includes('network error')) {
              console.error(`❌ Subscription error for project ${project.id} (${eventSig}):`, error);
            }
            // Don't throw - let other subscriptions continue
          },
        });
      } catch (error: any) {
        // Log the error but don't suppress it - we need to know if subscriptions are failing
        const errorMsg = error?.message || String(error);
        console.error(`❌ Subscription error for ${eventSig}:`, errorMsg);
        // Re-throw so it's caught by Promise.allSettled
        throw error;
      }

      // Handle Error case
      if (result instanceof Error) {
        throw result;
      }

      return result;
    })
  );

  // Filter out failed subscriptions and extract valid ones
  const subscriptions: SubscriptionReturnType[] = [];
  for (let i = 0; i < subscriptionResults.length; i++) {
    const result = subscriptionResults[i];
    const eventSig = eventSignatures[i];
    
    if (result.status === 'fulfilled' && !(result.value instanceof Error)) {
      subscriptions.push(result.value as SubscriptionReturnType);
      console.log(`✅ Successfully subscribed to event: ${eventSig}`);
    } else if (result.status === 'rejected') {
      const errorMsg = result.reason?.message || String(result.reason);
      // Suppress non-critical WebSocket errors
      if (errorMsg.includes('non-101') || errorMsg.includes('network error')) {
        console.warn(`⚠️ Subscription warning for ${eventSig} (may still work): ${errorMsg.substring(0, 100)}`);
      } else {
        console.error(`❌ Subscription failed for ${eventSig}:`, result.reason);
      }
    } else if (result.status === 'fulfilled' && result.value instanceof Error) {
      console.error(`❌ Subscription returned error for ${eventSig}:`, result.value);
    }
  }
  
    if (subscriptions.length === 0) {
      // No WebSocket subscriptions succeeded - fall back to HTTP polling
      throw new Error('No successful WebSocket subscriptions - will fall back to HTTP polling');
    } else {
      console.log(`✅ ${subscriptions.length}/${eventSignatures.length} WebSocket subscriptions active for project ${project.id}`);
    }

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
  } catch (error: any) {
    // WebSocket subscription failed - fall back to HTTP polling
    console.warn(`⚠️ WebSocket subscription failed for project ${project.id}`);
    console.warn(`   Error: ${error?.message || String(error)}`);
    console.warn(`   Falling back to HTTP polling (checks every 3 seconds)...`);
    
    const pollingSubscription = await pollForEventsHTTP(project, onEvent);
    activeSubscriptions.set(subscriptionKey, pollingSubscription);
    return pollingSubscription;
  }
}

/**
 * Unsubscribe from all project events
 */
export function unsubscribeAll() {
  activeSubscriptions.forEach(({ unsubscribe }) => unsubscribe());
  activeSubscriptions.clear();
  // Also clear polling intervals
  pollingIntervals.forEach((interval) => clearInterval(interval));
  pollingIntervals.clear();
}

/**
 * Get active subscription count
 */
export function getActiveSubscriptionCount(): number {
  return activeSubscriptions.size;
}
