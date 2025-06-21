const fs = require("fs");
const path = require("path");
const {
  SubscriptionManager,
  simulateScript,
  ResponseListener,
  ReturnType,
  decodeResult,
  FulfillmentCode,
} = require("@chainlink/functions-toolkit");
const ethers = require("ethers");
require("dotenv").config();

// Configuration
const consumerAddress = "0x3416c861d45190a04a7497052a9efc13b960125f";
const subscriptionId = 5085;

// Network configuration for Ethereum Sepolia
const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
const donId = "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000";
const explorerUrl = "https://sepolia.etherscan.io";

// BoxOfficeConsumer ABI
const boxOfficeConsumerAbi = [
  "function sendRequest(string source, string[] args, uint64 subscriptionId, string requestType) external returns (bytes32 requestId)",
  "function getDailyData(bytes32 requestId) external view returns (uint256)",
  "function getWeeklyData(bytes32 requestId) external view returns (uint256)",
  "function getMonthlyData(bytes32 requestId) external view returns (uint256)",
  "function getSeasonalData(bytes32 requestId) external view returns (uint256)",
  "function getQuarterlyData(bytes32 requestId) external view returns (uint256)",
  "function getYearlyData(bytes32 requestId) external view returns (uint256)",
  "function getHealthData(bytes32 requestId) external view returns (uint256)",
  "function decodeBoxOfficeData(uint256 boxOfficeData) external pure returns (uint32 movieCount, uint256 revenueThousands)",
  "function getRequestMetadata(bytes32 requestId) external view returns (string requestType, uint256 timestamp)",
  "function getRouter() external view returns (address)",
  "function getDonID() external view returns (bytes32)",
  "event RequestSent(bytes32 indexed requestId, string requestType, uint256 timestamp)",
  "event RequestFulfilled(bytes32 indexed requestId, string requestType, uint256 data, uint256 timestamp)",
  "event RequestFailed(bytes32 indexed requestId, string requestType, string error, uint256 timestamp)"
];

// Initialize provider and signer
function initializeProvider() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("private key not provided - check your environment variables");
  }

  const rpcUrl = process.env.ETHEREUM_SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    throw new Error("rpcUrl not provided - check your environment variables");
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider);
  
  return { provider, signer };
}

// Function to display decoded data in a human-readable format
function displayDecodedData(requestType, decodedResponse) {
  switch (requestType) {
    case "HEALTH":
      const healthStatus = decodedResponse === 1 ? "Healthy" : "Unhealthy";
      console.log(`Box Office API Status: ${healthStatus}`);
      break;
    default:
      const movieCount = decodedResponse & 0xFFFFFFFF;
      const revenueThousands = (decodedResponse >> 32);
      const totalRevenue = revenueThousands * 1000;
      
      console.log(`${requestType.charAt(0) + requestType.slice(1).toLowerCase()} Box Office Data:`);
      console.log(`   - Movies Tracked: ${movieCount}`);
      console.log(`   - Revenue: $${revenueThousands.toLocaleString()} thousand`);
      console.log(`   - Total Revenue: $${totalRevenue.toLocaleString()}`);
      break;
  }
}

// Main request function
async function makeRequest(requestType, additionalParam = "", options = {}) {
  const {
    enableSimulation = true,
    enableEstimation = true,
    enableOnChainRequest = true,
    enableResponseListening = true,
    verbose = true
  } = options;

  const source = fs
    .readFileSync(path.resolve(__dirname, "source.js"))
    .toString();

  const args = [requestType, additionalParam];
  const { provider, signer } = initializeProvider();

  let result = {
    requestType,
    additionalParam,
    simulation: null,
    estimation: null,
    transaction: null,
    response: null,
    decodedData: null,
    error: null
  };

  try {
    // Simulation
    if (enableSimulation) {
      if (verbose) console.log(`\nStarting simulation for ${requestType} request...`);

      const simulationResponse = await simulateScript({
        source: source,
        args: args,
        bytesArgs: [],
        secrets: {},
      });

      result.simulation = simulationResponse;

      if (simulationResponse.errorString) {
        result.error = `Simulation error: ${simulationResponse.errorString}`;
        if (verbose) console.log(`Error during simulation: ${simulationResponse.errorString}`);
        return result;
      } else {
        const returnType = ReturnType.uint256;
        const responseBytesHexstring = simulationResponse.responseBytesHexstring;
        if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
          const decodedResponse = decodeResult(responseBytesHexstring, returnType);
          if (verbose) {
            console.log(`Decoded simulation response: ${decodedResponse}`);
            displayDecodedData(requestType, decodedResponse);
          }
          result.decodedData = decodedResponse;
        }
      }
    }

    // Cost estimation
    if (enableEstimation) {
      if (verbose) console.log("\nEstimating request costs...");
      
      const subscriptionManager = new SubscriptionManager({
        signer: signer,
        linkTokenAddress: linkTokenAddress,
        functionsRouterAddress: routerAddress,
      });
      await subscriptionManager.initialize();

      const gasPriceWei = await signer.getGasPrice();
      const estimatedCostInJuels = await subscriptionManager.estimateFunctionsRequestCost({
        donId: donId,
        subscriptionId: subscriptionId,
        callbackGasLimit: 300000,
        gasPriceWei: BigInt(gasPriceWei),
      });

      result.estimation = {
        costInJuels: estimatedCostInJuels,
        costInLink: ethers.utils.formatEther(estimatedCostInJuels)
      };

      if (verbose) console.log(`Estimated cost: ${result.estimation.costInLink} LINK`);
    }

    // On-chain request
    if (enableOnChainRequest) {
      if (verbose) console.log(`\nMaking ${requestType} request...`);

      const boxOfficeConsumer = new ethers.Contract(
        consumerAddress,
        boxOfficeConsumerAbi,
        signer
      );

      const transaction = await boxOfficeConsumer.sendRequest(
        source,
        args,
        subscriptionId,
        requestType
      );

      result.transaction = {
        hash: transaction.hash,
        explorerUrl: `${explorerUrl}/tx/${transaction.hash}`
      };

      if (verbose) {
        console.log(`Request sent! Transaction hash: ${transaction.hash}`);
        console.log(`View transaction: ${result.transaction.explorerUrl}`);
      }

      // Listen for response
      if (enableResponseListening) {
        if (verbose) console.log("\nListening for response...");

        const responseListener = new ResponseListener({
          provider: provider,
          functionsRouterAddress: routerAddress,
        });

        const response = await new Promise((resolve, reject) => {
          responseListener
            .listenForResponseFromTransaction(transaction.hash)
            .then(resolve)
            .catch(reject);
        });

        result.response = response;

        const fulfillmentCode = response.fulfillmentCode;

        if (fulfillmentCode === FulfillmentCode.FULFILLED) {
          if (verbose) {
            console.log(`\nRequest ${response.requestId} successfully fulfilled!`);
            console.log(`Cost: ${ethers.utils.formatEther(response.totalCostInJuels)} LINK`);
          }
          
          if (response.responseBytesHexstring && ethers.utils.arrayify(response.responseBytesHexstring).length > 0) {
            const decodedResponse = decodeResult(response.responseBytesHexstring, ReturnType.uint256);
            if (verbose) {
              console.log(`Decoded response: ${decodedResponse}`);
              displayDecodedData(requestType, decodedResponse);
            }
            result.decodedData = decodedResponse;
          }
        } else if (fulfillmentCode === FulfillmentCode.USER_CALLBACK_ERROR) {
          if (verbose) console.log(`\nRequest ${response.requestId} fulfilled but consumer callback failed`);
        } else {
          if (verbose) console.log(`\nRequest ${response.requestId} not fulfilled. Code: ${fulfillmentCode}`);
        }

        if (response.errorString) {
          result.error = response.errorString;
          if (verbose) console.log(`Error: ${response.errorString}`);
        }
      }
    }

    return result;

  } catch (error) {
    result.error = error.message;
    if (verbose) console.error("Error in makeRequest:", error);
    return result;
  }
}

// Convenience functions for different request types
async function requestDailyData(date = "", options = {}) {
  console.log("=== REQUESTING DAILY BOX OFFICE DATA ===");
  return await makeRequest("DAILY", date, options);
}

async function requestWeeklyData(yearWeek = "", options = {}) {
  console.log("=== REQUESTING WEEKLY BOX OFFICE DATA ===");
  return await makeRequest("WEEKLY", yearWeek, options);
}

async function requestMonthlyData(yearMonth = "", options = {}) {
  console.log("=== REQUESTING MONTHLY BOX OFFICE DATA ===");
  return await makeRequest("MONTHLY", yearMonth, options);
}

async function requestSeasonalData(yearSeason = "", options = {}) {
  console.log("=== REQUESTING SEASONAL BOX OFFICE DATA ===");
  return await makeRequest("SEASONAL", yearSeason, options);
}

async function requestQuarterlyData(yearQuarter = "", options = {}) {
  console.log("=== REQUESTING QUARTERLY BOX OFFICE DATA ===");
  return await makeRequest("QUARTERLY", yearQuarter, options);
}

async function requestYearlyData(year = "", options = {}) {
  console.log("=== REQUESTING YEARLY BOX OFFICE DATA ===");
  return await makeRequest("YEARLY", year, options);
}

async function requestHealthCheck(options = {}) {
  console.log("=== REQUESTING API HEALTH CHECK ===");
  return await makeRequest("HEALTH", "", options);
}

// Export all functions
module.exports = {
  // Main function
  makeRequest,
  
  // Convenience functions
  requestDailyData,
  requestWeeklyData,
  requestMonthlyData,
  requestSeasonalData,
  requestQuarterlyData,
  requestYearlyData,
  requestHealthCheck,
  
  // Utility functions
  displayDecodedData,
  initializeProvider,
  
  // Constants
  consumerAddress,
  subscriptionId,
  routerAddress,
  linkTokenAddress,
  donId,
  explorerUrl
}; 