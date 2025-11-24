import { createWalletClient, createPublicClient, http, encodeFunctionData } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { somniaDreamChain } from "../lib/somnia-streams";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface TestWallet {
  privateKey: `0x${string}`;
  account: ReturnType<typeof privateKeyToAccount>;
}

async function main() {
  // Get main account (funding account)
  let mainPrivateKey = process.env.PRIVATE_KEY;
  if (!mainPrivateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }

  if (!mainPrivateKey.startsWith('0x')) {
    mainPrivateKey = '0x' + mainPrivateKey;
  }

  const mainAccount = privateKeyToAccount(mainPrivateKey as `0x${string}`);
  const rpcUrl = process.env.SOMNIA_RPC_TESTNET || "https://dream-rpc.somnia.network/";

  const publicClient = createPublicClient({
    chain: somniaDreamChain as any,
    transport: http(rpcUrl),
  });

  const mainWalletClient = createWalletClient({
    account: mainAccount,
    chain: somniaDreamChain as any,
    transport: http(rpcUrl),
  });

  console.log("🎮 Starting Games Shuffle Test Script");
  console.log("📊 Main Account:", mainAccount.address);
  
  // Check main account balance
  const mainBalance = await publicClient.getBalance({ address: mainAccount.address });
  console.log("💰 Main Account Balance:", (Number(mainBalance) / 1e18).toFixed(4), "SOM");

  // Load contract address
  const deploymentFile = path.join(process.cwd(), "deployments", "undefined.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const gamesContractAddress = deploymentInfo.contracts.MappableGames as `0x${string}`;

  // Load ABI
  const gamesAbiFile = path.join(process.cwd(), "abis", "MappableGames.json");
  const gamesAbi = JSON.parse(fs.readFileSync(gamesAbiFile, "utf-8"));

  // Generate 16 test wallets
  const walletCount = 16;
  console.log(`\n🔑 Generating ${walletCount} test wallets...`);
  const testWallets: TestWallet[] = [];
  for (let i = 0; i < walletCount; i++) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    testWallets.push({ privateKey, account });
    console.log(`   Wallet ${i + 1}: ${account.address}`);
  }

  // Fund each wallet with 0.02 SOM
  const fundingAmount = BigInt(0.02 * 1e18); // 0.02 SOM in wei
  console.log(`\n💸 Funding each wallet with ${(Number(fundingAmount) / 1e18).toFixed(4)} SOM...`);
  
  for (let i = 0; i < testWallets.length; i++) {
    const wallet = testWallets[i];
    try {
      console.log(`   Funding wallet ${i + 1}/${testWallets.length}...`);
      const hash = await mainWalletClient.sendTransaction({
        to: wallet.account.address,
        value: fundingAmount,
        account: mainAccount,
        chain: somniaDreamChain as any,
      });
      
      await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   ✅ Wallet ${i + 1} funded: ${hash}`);
    } catch (error) {
      console.error(`   ❌ Failed to fund wallet ${i + 1}:`, error);
    }
  }

  console.log("\n✅ All wallets funded!");
  console.log("\n🎮 Starting game interactions (every 5 seconds)...\n");

  // Helper function to play game
  async function playGame(wallet: TestWallet, walletIndex: number): Promise<void> {
    const walletClient = createWalletClient({
      account: wallet.account,
      chain: somniaDreamChain as any,
      transport: http(rpcUrl),
    });

    const gameId = BigInt(Date.now() + walletIndex);
    const betAmount = BigInt(1000000000000000); // 0.001 SOM

    // Start game
    const startGameData = encodeFunctionData({
      abi: gamesAbi as any,
      functionName: "startGame",
      args: [gameId],
    });

    try {
      const startHash = await walletClient.sendTransaction({
        to: gamesContractAddress,
        data: startGameData,
        value: betAmount,
        account: wallet.account,
        chain: somniaDreamChain as any,
      });
      
      const startReceipt = await publicClient.waitForTransactionReceipt({ hash: startHash });
      
      // Wait a bit before completing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Complete game (random win/loss)
      const won = Math.random() > 0.5;
      const completeGameData = encodeFunctionData({
        abi: gamesAbi as any,
        functionName: "completeGame",
        args: [gameId, won],
      });

      const completeHash = await walletClient.sendTransaction({
        to: gamesContractAddress,
        data: completeGameData,
        account: wallet.account,
        chain: somniaDreamChain as any,
      });
      
      const completeReceipt = await publicClient.waitForTransactionReceipt({ hash: completeHash });
      console.log(`   🎲 Wallet ${walletIndex + 1} played game (${won ? 'WON' : 'LOST'}) - TX: ${completeHash.substring(0, 10)}... Block: ${completeReceipt.blockNumber}`);
    } catch (error) {
      console.error(`   ❌ Wallet ${walletIndex + 1} game failed:`, error);
    }
  }

  // Shuffle wallets and create interactions
  const shuffledWallets = [...testWallets].sort(() => Math.random() - 0.5);
  let interactionCount = 0;
  const totalInteractions = shuffledWallets.length;

  // Process interactions with 5 second delays
  for (let i = 0; i < shuffledWallets.length; i++) {
    const wallet = shuffledWallets[i];
    const walletIndex = testWallets.indexOf(wallet);

    // Game interaction
    await new Promise(resolve => setTimeout(resolve, 5000));
    interactionCount++;
    console.log(`\n[${interactionCount}/${totalInteractions}] Game Interaction - Wallet ${walletIndex + 1}`);
    await playGame(wallet, walletIndex);
  }

  console.log("\n\n✨ Games shuffle test complete!");
  console.log(`📊 Total game plays: ${totalInteractions}`);
  console.log("📡 Check your tracker server to see if all events were captured!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

