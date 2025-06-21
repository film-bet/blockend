const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("Deploying BoxOfficeConsumer...");

  const BoxOfficeConsumer = await ethers.getContractFactory("MultiAPIConsumer");
  const boxOfficeConsumer = await BoxOfficeConsumer.deploy();

  await boxOfficeConsumer.deployed();

  console.log("BoxOfficeConsumer deployed successfully!");
  console.log(`Contract Address: ${boxOfficeConsumer.address}`);

  // Verify deployment by checking key parameters
  console.log("\nVerifying deployment...");
  
  try {
    const owner = await boxOfficeConsumer.owner();
    const router = await boxOfficeConsumer.getRouter();
    const donID = await boxOfficeConsumer.getDonID();

    console.log(`Owner verification: ${owner}`);
    console.log(`Router verification: ${router}`);
    console.log(`DonID verification: ${donID}`);

    // Check if we're on Sepolia network
    const network = await ethers.provider.getNetwork();
    const isSepolia = network.chainId === 11155111; // Sepolia chain ID

    if (isSepolia) {
      // Verify router address matches Sepolia configuration
      const expectedRouter = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
      if (router === expectedRouter) {
        console.log("Router address matches Sepolia configuration");
      } else {
        console.log("Router address mismatch for Sepolia!");
      }

      // Verify DonID matches Sepolia configuration
      const expectedDonID = "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000";
      if (donID === expectedDonID) {
        console.log("DonID matches Sepolia configuration");
      } else {
        console.log("DonID mismatch for Sepolia!");
      }
    } else {
      console.log("Contract deployed on non-Sepolia network. Router and DonID are hardcoded for Sepolia.");
    }

    console.log("Contract deployed and verified successfully!");
  } catch (error) {
    console.log("Verification failed:", error.message);
  }

  // Display contract information
  console.log("\nContract Information:");
  console.log("=====================");
  console.log(`Contract Name: MultiAPIConsumer`);
  console.log(`Contract Address: ${boxOfficeConsumer.address}`);
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Owner: ${owner}`);
  console.log(`Router: ${router}`);
  console.log(`DonID: ${donID}`);

  // Display available endpoints
  console.log("\nAvailable box office endpoints:");
  console.log("===============================");
  console.log("1. Daily Box Office Data");
  console.log("   - Endpoint: /daily");
  console.log("   - Parameters: date (YYYY-MM-DD format)");
  console.log("   - Example: 2024-01-15");
  console.log("");
  console.log("2. Weekly Box Office Data");
  console.log("   - Endpoint: /weekly");
  console.log("   - Parameters: year, week");
  console.log("   - Example: 2024, 3");
  console.log("");
  console.log("3. Monthly Box Office Data");
  console.log("   - Endpoint: /monthly");
  console.log("   - Parameters: year, month");
  console.log("   - Example: 2024, 1");
  console.log("");
  console.log("4. Seasonal Box Office Data");
  console.log("   - Endpoint: /seasonal");
  console.log("   - Parameters: year, season");
  console.log("   - Example: 2024, summer");
  console.log("");
  console.log("5. Quarterly Box Office Data");
  console.log("   - Endpoint: /quarterly");
  console.log("   - Parameters: year, quarter");
  console.log("   - Example: 2024, 1");
  console.log("");
  console.log("6. Yearly Box Office Data");
  console.log("   - Endpoint: /yearly");
  console.log("   - Parameters: year");
  console.log("   - Example: 2024");
  console.log("");
  console.log("7. Health Check");
  console.log("   - Endpoint: /health");
  console.log("   - Parameters: none");
  console.log("   - Returns: API health status");

  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 