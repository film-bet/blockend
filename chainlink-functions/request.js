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

const consumerAddress = "0x3416c861d45190a04a7497052a9efc13b960125f"; // REPLACE with your deployed contract address
const subscriptionId = 5085; // REPLACE with your subscription ID

const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
const linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
const donId = "0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000";
const explorerUrl = "https://sepolia.etherscan.io";

// BoxOfficeConsumer ABI (simplified for the functions we need)
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

const makeRequest = async (requestType, additionalParam = "") => {
  const source = fs
    .readFileSync(path.resolve(__dirname, "source.js"))
    .toString();

  const args = [requestType, additionalParam];

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

  console.log(`\nStarting simulation for ${requestType} request...`);

  const response = await simulateScript({
    source: source,
    args: args,
    bytesArgs: [],
    secrets: {},
  });

  console.log("Simulation result:", response);
  
  if (response.errorString) {
    console.log(`Error during simulation: ${response.errorString}`);
    return;
  } else {
    const returnType = ReturnType.uint256;
    const responseBytesHexstring = response.responseBytesHexstring;
    if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
      const decodedResponse = decodeResult(responseBytesHexstring, returnType);
      console.log(`Decoded response to ${returnType}: ${decodedResponse}`);
      
      displayDecodedData(requestType, decodedResponse);
      
      console.log("\nFull simulation response details:");
      console.log("Response bytes (hex):", response.responseBytesHexstring);
      console.log("Response string:", response.responseString || "N/A");
      console.log("Error string:", response.errorString || "None");
      console.log("Captured stdout:", response.capturedStdout || "None");
      console.log("Captured stderr:", response.capturedStderr || "None");
    }
  }

  console.log("\nEstimating request costs...");
  
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

  console.log(`Estimated cost: ${ethers.utils.formatEther(estimatedCostInJuels)} LINK`);

  console.log(`\nMaking ${requestType} request...`);

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

  console.log(`Request sent! Transaction hash: ${transaction.hash}`);
  console.log(`View transaction: ${explorerUrl}/tx/${transaction.hash}`);

  console.log("\nListening for response...");

  const responseListener = new ResponseListener({
    provider: provider,
    functionsRouterAddress: routerAddress,
  });

  try {
    const response = await new Promise((resolve, reject) => {
      responseListener
        .listenForResponseFromTransaction(transaction.hash)
        .then(resolve)
        .catch(reject);
    });

    const fulfillmentCode = response.fulfillmentCode;

    if (fulfillmentCode === FulfillmentCode.FULFILLED) {
      console.log(`\nRequest ${response.requestId} successfully fulfilled!`);
      console.log(`Cost: ${ethers.utils.formatEther(response.totalCostInJuels)} LINK`);
      
      if (response.responseBytesHexstring && ethers.utils.arrayify(response.responseBytesHexstring).length > 0) {
        const decodedResponse = decodeResult(response.responseBytesHexstring, ReturnType.uint256);
        console.log(`Decoded response: ${decodedResponse}`);
        
        displayDecodedData(requestType, decodedResponse);
      }
      
      console.log("\nFull response details:");
      console.log("Request ID:", response.requestId);
      console.log("Response bytes (hex):", response.responseBytesHexstring);
      console.log("Response string:", response.responseString || "N/A");
      console.log("Error string:", response.errorString || "None");
      console.log("Captured stdout:", response.capturedStdout || "None");
      console.log("Captured stderr:", response.capturedStderr || "None");
      
      if (response.capturedStdout) {
        console.log("\nParsing captured stdout for JSON data:");
        try {
          const jsonMatches = response.capturedStdout.match(/\[.*\]|\{.*\}/g);
          if (jsonMatches) {
            jsonMatches.forEach((match, index) => {
              try {
                const parsed = JSON.parse(match);
                console.log(`\nJSON Data ${index + 1}:`);
                console.log(JSON.stringify(parsed, null, 2));
              } catch (e) {
                console.log(`\nRaw Data ${index + 1} (not valid JSON):`);
                console.log(match);
              }
            });
          } else {
            console.log("No JSON patterns found in stdout");
          }
        } catch (e) {
          console.log("Error parsing stdout:", e.message);
        }
      }
      
    } else if (fulfillmentCode === FulfillmentCode.USER_CALLBACK_ERROR) {
      console.log(`\nRequest ${response.requestId} fulfilled but consumer callback failed`);
      console.log(`Cost: ${ethers.utils.formatEther(response.totalCostInJuels)} LINK`);
    } else {
      console.log(`\nRequest ${response.requestId} not fulfilled. Code: ${fulfillmentCode}`);
      console.log(`Cost: ${ethers.utils.formatEther(response.totalCostInJuels)} LINK`);
    }

    if (response.errorString) {
      console.log(`Error: ${response.errorString}`);
    }

    return response.requestId;
  } catch (error) {
    console.error("Error listening for response:", error);
  }
};

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

const requestDailyData = async (date = "") => {
  console.log("=== REQUESTING DAILY BOX OFFICE DATA ===");
  return await makeRequest("DAILY", date);
};

const requestWeeklyData = async (yearWeek = "") => {
  console.log("=== REQUESTING WEEKLY BOX OFFICE DATA ===");
  return await makeRequest("WEEKLY", yearWeek);
};

const requestMonthlyData = async (yearMonth = "") => {
  console.log("=== REQUESTING MONTHLY BOX OFFICE DATA ===");
  return await makeRequest("MONTHLY", yearMonth);
};

const requestSeasonalData = async (yearSeason = "") => {
  console.log("=== REQUESTING SEASONAL BOX OFFICE DATA ===");
  return await makeRequest("SEASONAL", yearSeason);
};

const requestQuarterlyData = async (yearQuarter = "") => {
  console.log("=== REQUESTING QUARTERLY BOX OFFICE DATA ===");
  return await makeRequest("QUARTERLY", yearQuarter);
};

const requestYearlyData = async (year = "") => {
  console.log("=== REQUESTING YEARLY BOX OFFICE DATA ===");
  return await makeRequest("YEARLY", year);
};

const requestHealthCheck = async () => {
  console.log("=== REQUESTING API HEALTH CHECK ===");
  return await makeRequest("HEALTH");
};

const main = async () => {
  try {
    await requestHealthCheck();
  } catch (error) {
    console.error("Error in main:", error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  makeRequest,
  requestDailyData,
  requestWeeklyData,
  requestMonthlyData,
  requestSeasonalData,
  requestQuarterlyData,
  requestYearlyData,
  requestHealthCheck,
}; 