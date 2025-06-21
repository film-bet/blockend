// Example usage of request-script.js
const {
  makeRequest,
  requestDailyData,
  requestWeeklyData,
  requestMonthlyData,
  requestSeasonalData,
  requestQuarterlyData,
  requestYearlyData,
  requestHealthCheck,
  displayDecodedData
} = require('./request-script.js');

// Example 1: Simple health check
async function exampleHealthCheck() {
  console.log("=== Example 1: Health Check ===");
  
  const result = await requestHealthCheck();
  
  if (result.error) {
    console.log("Error:", result.error);
  } else {
    console.log("Health check completed successfully");
    console.log("Decoded data:", result.decodedData);
    console.log("Transaction hash:", result.transaction?.hash);
  }
}

// Example 2: Daily data request with custom options
async function exampleDailyRequest() {
  console.log("\n=== Example 2: Daily Data Request ===");
  
  const options = {
    enableSimulation: true,
    enableEstimation: true,
    enableOnChainRequest: true,
    enableResponseListening: true,
    verbose: true
  };
  
  const result = await requestDailyData("2024-01-15", options);
  
  if (result.error) {
    console.log("Error:", result.error);
  } else {
    console.log("Daily request completed successfully");
    console.log("Decoded data:", result.decodedData);
    console.log("Estimated cost:", result.estimation?.costInLink, "LINK");
    console.log("Transaction hash:", result.transaction?.hash);
  }
}

// Example 3: Weekly data request (simulation only)
async function exampleWeeklySimulation() {
  console.log("\n=== Example 3: Weekly Data Simulation Only ===");
  
  const options = {
    enableSimulation: true,
    enableEstimation: false,
    enableOnChainRequest: false,
    enableResponseListening: false,
    verbose: true
  };
  
  const result = await requestWeeklyData("2024-3", options);
  
  if (result.error) {
    console.log("Error:", result.error);
  } else {
    console.log("Weekly simulation completed successfully");
    console.log("Decoded data:", result.decodedData);
  }
}

// Example 4: Using the main makeRequest function directly
async function exampleCustomRequest() {
  console.log("\n=== Example 4: Custom Request ===");
  
  const result = await makeRequest("MONTHLY", "2024-1", {
    enableSimulation: true,
    enableEstimation: true,
    enableOnChainRequest: false, // Skip on-chain request
    verbose: false // Reduce console output
  });
  
  if (result.error) {
    console.log("Error:", result.error);
  } else {
    console.log("Custom request completed successfully");
    console.log("Request type:", result.requestType);
    console.log("Additional param:", result.additionalParam);
    console.log("Decoded data:", result.decodedData);
  }
}

// Example 5: Batch requests
async function exampleBatchRequests() {
  console.log("\n=== Example 5: Batch Requests ===");
  
  const requests = [
    { type: "HEALTH", param: "" },
    { type: "DAILY", param: "2024-01-15" },
    { type: "WEEKLY", param: "2024-3" }
  ];
  
  const results = [];
  
  for (const req of requests) {
    console.log(`\nProcessing ${req.type} request...`);
    const result = await makeRequest(req.type, req.param, {
      enableSimulation: true,
      enableEstimation: false,
      enableOnChainRequest: false,
      verbose: false
    });
    results.push(result);
  }
  
  console.log("\nBatch Results Summary:");
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.requestType}: ${result.error ? 'Error' : 'Success'} - Data: ${result.decodedData}`);
  });
}

// Example 6: Error handling
async function exampleErrorHandling() {
  console.log("\n=== Example 6: Error Handling ===");
  
  try {
    // This will likely fail due to invalid date format
    const result = await requestDailyData("invalid-date");
    
    if (result.error) {
      console.log("Expected error caught:", result.error);
    } else {
      console.log("Request succeeded unexpectedly");
    }
  } catch (error) {
    console.log("Unexpected error:", error.message);
  }
}

// Main execution function
async function main() {
  try {
    // Run examples
    await exampleHealthCheck();
    await exampleDailyRequest();
    await exampleWeeklySimulation();
    await exampleCustomRequest();
    await exampleBatchRequests();
    await exampleErrorHandling();
    
    console.log("\nAll examples completed!");
    
  } catch (error) {
    console.error("Main execution error:", error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

// Export examples for use in other files
module.exports = {
  exampleHealthCheck,
  exampleDailyRequest,
  exampleWeeklySimulation,
  exampleCustomRequest,
  exampleBatchRequests,
  exampleErrorHandling,
  main
}; 