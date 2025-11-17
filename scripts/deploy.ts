import hre from "hardhat";
import { createWalletClient, createPublicClient, http, encodeDeployData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { somniaDreamChain } from "../lib/somnia-streams";
import * as fs from "fs";
import * as path from "path";

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

  console.log("Deploying contracts with account:", account.address);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Account balance:", balance.toString(), "wei");

  // Get contract artifacts
  const mappableNFTsArtifact = await hre.artifacts.readArtifact("MappableNFTs");
  const mappableGamesArtifact = await hre.artifacts.readArtifact("MappableGames");
  const mappableStoresArtifact = await hre.artifacts.readArtifact("MappableStores");

  // Helper function to deploy a contract
  async function deployContract(artifact: any, contractName: string): Promise<string> {
    const deployData = encodeDeployData({
      abi: artifact.abi,
      bytecode: artifact.bytecode as `0x${string}`,
      args: [],
    });

    const hash = await walletClient.sendTransaction({
      data: deployData,
      account,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (!receipt.contractAddress) {
      throw new Error(`Failed to deploy ${contractName}`);
    }
    return receipt.contractAddress;
  }

  // Deploy MappableNFTs
  console.log("\n📦 Deploying MappableNFTs...");
  const mappableNFTsAddress = await deployContract(mappableNFTsArtifact, "MappableNFTs");
  console.log("✅ MappableNFTs deployed to:", mappableNFTsAddress);

  // Deploy MappableGames
  console.log("\n🎮 Deploying MappableGames...");
  const mappableGamesAddress = await deployContract(mappableGamesArtifact, "MappableGames");
  console.log("✅ MappableGames deployed to:", mappableGamesAddress);

  // Deploy MappableStores
  console.log("\n🛒 Deploying MappableStores...");
  const mappableStoresAddress = await deployContract(mappableStoresArtifact, "MappableStores");
  console.log("✅ MappableStores deployed to:", mappableStoresAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: await publicClient.getChainId(),
    deployer: account.address,
    contracts: {
      MappableNFTs: mappableNFTsAddress,
      MappableGames: mappableGamesAddress,
      MappableStores: mappableStoresAddress,
    },
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const networkName = hre.network.name || "somnia_testnet";
  const deploymentFile = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📝 Deployment info saved to:", deploymentFile);
  console.log("\n🎉 All contracts deployed successfully!");
  console.log("\nContract Addresses:");
  console.log("  MappableNFTs:", mappableNFTsAddress);
  console.log("  MappableGames:", mappableGamesAddress);
  console.log("  MappableStores:", mappableStoresAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

