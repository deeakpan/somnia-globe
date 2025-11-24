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

  console.log("🎨 Starting NFT Shuffle Test Script");
  console.log("📊 Main Account:", mainAccount.address);
  
  // Check main account balance
  const mainBalance = await publicClient.getBalance({ address: mainAccount.address });
  console.log("💰 Main Account Balance:", (Number(mainBalance) / 1e18).toFixed(4), "SOM");

  // Load contract address
  const deploymentFile = path.join(process.cwd(), "deployments", "undefined.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const nftContractAddress = deploymentInfo.contracts.MappableNFTs as `0x${string}`;

  // Load ABI
  const nftAbiFile = path.join(process.cwd(), "abis", "MappableNFTs.json");
  const nftAbi = JSON.parse(fs.readFileSync(nftAbiFile, "utf-8"));

  // Generate 15 test wallets
  const walletCount = 15;
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
  console.log("\n🎨 Starting NFT interactions (every 5 seconds)...\n");

  // Helper function to mint NFT
  async function mintNFT(wallet: TestWallet, walletIndex: number): Promise<void> {
    const walletClient = createWalletClient({
      account: wallet.account,
      chain: somniaDreamChain as any,
      transport: http(rpcUrl),
    });

    const tokenURI = `https://example.com/nft/shuffle-${Date.now()}-${walletIndex}`;
    const data = encodeFunctionData({
      abi: nftAbi as any,
      functionName: "mintNFT",
      args: [tokenURI],
    });

    try {
      const hash = await walletClient.sendTransaction({
        to: nftContractAddress,
        data: data,
        account: wallet.account,
        chain: somniaDreamChain as any,
      });
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`   🎨 Wallet ${walletIndex + 1} minted NFT - TX: ${hash.substring(0, 10)}... Block: ${receipt.blockNumber}`);
    } catch (error) {
      console.error(`   ❌ Wallet ${walletIndex + 1} NFT mint failed:`, error);
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

    // NFT interaction
    await new Promise(resolve => setTimeout(resolve, 5000));
    interactionCount++;
    console.log(`\n[${interactionCount}/${totalInteractions}] NFT Interaction - Wallet ${walletIndex + 1}`);
    await mintNFT(wallet, walletIndex);
  }

  console.log("\n\n✨ NFT shuffle test complete!");
  console.log(`📊 Total NFT mints: ${totalInteractions}`);
  console.log("📡 Check your tracker server to see if all events were captured!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

