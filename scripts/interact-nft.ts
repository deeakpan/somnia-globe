import { createWalletClient, createPublicClient, http, encodeFunctionData, parseAbi } from "viem";
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

  console.log("Interacting with MappableNFTs contract...");
  console.log("Account:", account.address);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Account balance:", balance.toString(), "wei");

  // Load contract address from deployment file
  const deploymentFile = path.join(process.cwd(), "deployments", "undefined.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf-8"));
  const contractAddress = deploymentInfo.contracts.MappableNFTs as `0x${string}`;
  
  console.log("\n📦 Contract Address:", contractAddress);

  // Load ABI
  const abiFile = path.join(process.cwd(), "abis", "MappableNFTs.json");
  const abi = JSON.parse(fs.readFileSync(abiFile, "utf-8"));

  // Get current total supply
  try {
    const totalSupply = (await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: "totalSupply",
      args: [],
    })) as bigint;
    console.log("Current total supply:", totalSupply.toString());
  } catch (error) {
    console.log("Could not read totalSupply (contract may not be initialized)");
  }

  // Prepare mintNFT function call
  const tokenURI = `https://example.com/nft/${Date.now()}`;
  console.log("\n🎨 Minting NFT with URI:", tokenURI);

  const data = encodeFunctionData({
    abi: abi as any,
    functionName: "mintNFT",
    args: [tokenURI],
  });

  // Send transaction
  console.log("\n📤 Sending transaction...");
  const hash = await walletClient.sendTransaction({
    to: contractAddress,
    data: data,
    account,
    chain: somniaDreamChain as any,
  });

  console.log("✅ Transaction hash:", hash);
  console.log("⏳ Waiting for confirmation...");

  // Wait for transaction receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  
  console.log("\n🎉 Transaction confirmed!");
  console.log("Block number:", receipt.blockNumber.toString());
  console.log("Gas used:", receipt.gasUsed.toString());
  
  // Check for NFTMinted event
  if (receipt.logs && receipt.logs.length > 0) {
    console.log("\n📋 Events emitted:");
    receipt.logs.forEach((log: any, index: number) => {
      console.log(`  Event ${index + 1}:`, log.topics[0]);
    });
  }

  // Get updated total supply
  try {
    const newTotalSupply = (await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: "totalSupply",
      args: [],
    })) as bigint;
    console.log("\n📊 New total supply:", newTotalSupply.toString());
  } catch (error) {
    console.log("Could not read new totalSupply");
  }

  console.log("\n✨ Interaction complete! Check your tracker to see if the event was captured in real-time.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

