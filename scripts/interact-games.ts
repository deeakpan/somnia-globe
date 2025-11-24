import { createWalletClient, createPublicClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaDreamChain } from "../lib/somnia-streams";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  // Add 0x prefix if not present
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const rpcUrl = process.env.SOMNIA_RPC_TESTNET || "https://dream-rpc.somnia.network/";

  const publicClient = createPublicClient({
    chain: somniaDreamChain as any,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaDreamChain as any,
    transport: http(rpcUrl),
  });

  console.log("Interacting with MappableGames contract...");
  console.log("Account:", account.address);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Account balance:", balance.toString(), "wei");

  // Load contract address from deployment file
  const deploymentFile = path.join(process.cwd(), "deployments", "undefined.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contractAddress = deploymentInfo.contracts.MappableGames as `0x${string}`;
  
  console.log("\n🎮 Contract Address:", contractAddress);

  // Load ABI
  const abiFile = path.join(process.cwd(), "abis", "MappableGames.json");
  const abi = JSON.parse(fs.readFileSync(abiFile, "utf-8"));

  // Get current game stats
  try {
    const totalGames = (await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: "totalGames",
      args: [],
    })) as bigint;
    console.log("Current total games:", totalGames.toString());

    const gameCounter = (await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: "gameCounter",
      args: [],
    })) as bigint;
    console.log("Game counter:", gameCounter.toString());

    const playerGamesCount = (await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: "playerGamesCount",
      args: [account.address],
    })) as bigint;
    console.log("Your games count:", playerGamesCount.toString());
  } catch (error) {
    console.log("Could not read game stats (contract may not be initialized)");
  }

  // Generate a unique game ID
  const gameId = BigInt(Date.now());
  const betAmount = BigInt(1000000000000000); // 0.001 ETH in wei (or equivalent for Somnia)
  
  console.log("\n🎲 Starting game...");
  console.log("Game ID:", gameId.toString());
  console.log("Bet amount:", betAmount.toString(), "wei");

  const startGameData = encodeFunctionData({
    abi: abi as any,
    functionName: "startGame",
    args: [gameId],
  });

  // Send transaction to start game
  console.log("\n📤 Sending startGame transaction...");
  const startHash = await walletClient.sendTransaction({
    to: contractAddress,
    data: startGameData,
    value: betAmount,
    account,
    chain: somniaDreamChain as any,
  });

  console.log("✅ Transaction hash:", startHash);
  console.log("⏳ Waiting for confirmation...");

  // Wait for transaction receipt
  const startReceipt = await publicClient.waitForTransactionReceipt({ hash: startHash });
  
  console.log("\n🎉 Game started!");
  console.log("Block number:", startReceipt.blockNumber.toString());
  console.log("Gas used:", startReceipt.gasUsed.toString());
  
  // Check for GameStarted event
  if (startReceipt.logs && startReceipt.logs.length > 0) {
    console.log("\n📋 Events emitted:");
    startReceipt.logs.forEach((log: any, index: number) => {
      console.log(`  Event ${index + 1}:`, log.topics[0]);
    });
  }

  // Wait a bit before completing the game
  console.log("\n⏸️  Waiting 2 seconds before completing game...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Complete the game (simulate a win)
  const won = true; // Set to true for win, false for loss
  console.log(`\n🏁 Completing game (won: ${won})...`);

  const completeGameData = encodeFunctionData({
    abi: abi as any,
    functionName: "completeGame",
    args: [gameId, won],
  });

  // Send transaction to complete game
  console.log("\n📤 Sending completeGame transaction...");
  const completeHash = await walletClient.sendTransaction({
    to: contractAddress,
    data: completeGameData,
    account,
    chain: somniaDreamChain as any,
  });

  console.log("✅ Transaction hash:", completeHash);
  console.log("⏳ Waiting for confirmation...");

  // Wait for transaction receipt
  const completeReceipt = await publicClient.waitForTransactionReceipt({ hash: completeHash });
  
  console.log("\n🎉 Game completed!");
  console.log("Block number:", completeReceipt.blockNumber.toString());
  console.log("Gas used:", completeReceipt.gasUsed.toString());
  
  // Check for GameCompleted event
  if (completeReceipt.logs && completeReceipt.logs.length > 0) {
    console.log("\n📋 Events emitted:");
    completeReceipt.logs.forEach((log: any, index: number) => {
      console.log(`  Event ${index + 1}:`, log.topics[0]);
    });
  }

  // Get updated game stats
  try {
    const newTotalGames = (await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: "totalGames",
      args: [],
    })) as bigint;
    console.log("\n📊 New total games:", newTotalGames.toString());

    const newPlayerGamesCount = (await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: "playerGamesCount",
      args: [account.address],
    })) as bigint;
    console.log("Your new games count:", newPlayerGamesCount.toString());
  } catch (error) {
    console.log("Could not read updated game stats");
  }

  console.log("\n✨ Interaction complete! Check your tracker to see if the events were captured in real-time.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

