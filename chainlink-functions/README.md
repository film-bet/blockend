# Chainlink Functions Box Office API Consumer

A modular script for making requests to the Box Office API using Chainlink Functions.

## Installation

```bash
npm install
```

## Environment Setup

Create a `.env` file with:

```env
PRIVATE_KEY=your_private_key_here
ETHEREUM_SEPOLIA_RPC_URL=your_sepolia_rpc_url_here
```

## Usage

### Import the Script

```javascript
const {
  makeRequest,
  requestDailyData,
  requestWeeklyData,
  requestMonthlyData,
  requestSeasonalData,
  requestQuarterlyData,
  requestYearlyData,
  requestHealthCheck
} = require('./request-script.js');
```

### Basic Functions

#### Health Check
```javascript
const result = await requestHealthCheck();
```

#### Daily Data
```javascript
const result = await requestDailyData("2024-01-15");
```

#### Weekly Data
```javascript
const result = await requestWeeklyData("2024-3"); // year-week format
```

#### Monthly Data
```javascript
const result = await requestMonthlyData("2024-1"); // year-month format
```

#### Seasonal Data
```javascript
const result = await requestSeasonalData("2024-summer"); // year-season format
```

#### Quarterly Data
```javascript
const result = await requestQuarterlyData("2024-1"); // year-quarter format
```

#### Yearly Data
```javascript
const result = await requestYearlyData("2024");
```

### Advanced Usage with Options

All functions accept an optional `options` parameter:

```javascript
const options = {
  enableSimulation: true,      // Run simulation (default: true)
  enableEstimation: true,      // Estimate costs (default: true)
  enableOnChainRequest: true,  // Make on-chain request (default: true)
  enableResponseListening: true, // Listen for response (default: true)
  verbose: true                // Show detailed logs (default: true)
};

const result = await requestDailyData("2024-01-15", options);
```

### Main Function

Use the main `makeRequest` function for custom requests:

```javascript
const result = await makeRequest(requestType, additionalParam, options);
```

**Parameters:**
- `requestType`: "DAILY", "WEEKLY", "MONTHLY", "SEASONAL", "QUARTERLY", "YEARLY", "HEALTH"
- `additionalParam`: Date, year-week, year-month, etc. (optional)
- `options`: Configuration object (optional)

### Result Object

All functions return a result object:

```javascript
{
  requestType: "DAILY",
  additionalParam: "2024-01-15",
  simulation: { /* simulation response */ },
  estimation: { costInJuels: "...", costInLink: "..." },
  transaction: { hash: "...", explorerUrl: "..." },
  response: { /* on-chain response */ },
  decodedData: 123456789,
  error: null
}
```

### Common Use Cases

#### Simulation Only (No Gas Cost)
```javascript
const result = await requestDailyData("2024-01-15", {
  enableSimulation: true,
  enableEstimation: false,
  enableOnChainRequest: false,
  verbose: true
});
```

#### Cost Estimation Only
```javascript
const result = await makeRequest("DAILY", "2024-01-15", {
  enableSimulation: false,
  enableEstimation: true,
  enableOnChainRequest: false,
  verbose: false
});
```

#### Full Request (Default)
```javascript
const result = await requestDailyData("2024-01-15");
```

#### Batch Requests
```javascript
const requests = [
  { type: "HEALTH", param: "" },
  { type: "DAILY", param: "2024-01-15" },
  { type: "WEEKLY", param: "2024-3" }
];

for (const req of requests) {
  const result = await makeRequest(req.type, req.param, {
    enableSimulation: true,
    enableEstimation: false,
    enableOnChainRequest: false,
    verbose: false
  });
  console.log(`${req.type}: ${result.decodedData}`);
}
```

### Error Handling

```javascript
const result = await requestDailyData("invalid-date");

if (result.error) {
  console.log("Error:", result.error);
} else {
  console.log("Success:", result.decodedData);
}
```

### Parameter Formats

- **Daily**: "YYYY-MM-DD" (e.g., "2024-01-15")
- **Weekly**: "YYYY-W" (e.g., "2024-3")
- **Monthly**: "YYYY-M" (e.g., "2024-1")
- **Seasonal**: "YYYY-season" (e.g., "2024-summer")
- **Quarterly**: "YYYY-Q" (e.g., "2024-1")
- **Yearly**: "YYYY" (e.g., "2024")
- **Health**: No parameters needed

### Available Seasons

- "spring"
- "summer"
- "fall" or "autumn"
- "winter"

### Network Configuration

The script is configured for Ethereum Sepolia testnet:
- Router: `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0`
- Link Token: `0x779877A7B0D9E8603169DdbD7836e478b4624789`
- DonID: `0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000`

### Contract Address

Update the `consumerAddress` in `request-script.js` with your deployed contract address:

```javascript
const consumerAddress = "your_deployed_contract_address";
const subscriptionId = your_subscription_id;
``` 