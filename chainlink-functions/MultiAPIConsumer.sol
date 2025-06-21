// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/**
 * @title BoxOfficeConsumer
 * @notice A smart contract that uses Chainlink Functions to call box office API endpoints
 * @dev This contract handles different types of box office data including daily, weekly, monthly, seasonal, quarterly, and yearly data
 */
contract BoxOfficeConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // State variables
    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    // Data storage for different box office responses
    mapping(bytes32 => uint256) public s_dailyData; // For daily box office data
    mapping(bytes32 => uint256) public s_weeklyData; // For weekly box office data
    mapping(bytes32 => uint256) public s_monthlyData; // For monthly box office data
    mapping(bytes32 => uint256) public s_seasonalData; // For seasonal box office data
    mapping(bytes32 => uint256) public s_quarterlyData; // For quarterly box office data
    mapping(bytes32 => uint256) public s_yearlyData; // For yearly box office data
    mapping(bytes32 => uint256) public s_healthData; // For API health status

    // Request tracking
    mapping(bytes32 => string) public s_requestTypes; // Track what type of data each request is for
    mapping(bytes32 => uint256) public s_requestTimestamps; // Track when requests were made

    // Events
    event RequestSent(bytes32 indexed requestId, string requestType, uint256 timestamp);
    event RequestFulfilled(bytes32 indexed requestId, string requestType, uint256 data, uint256 timestamp);
    event RequestFailed(bytes32 indexed requestId, string requestType, string error, uint256 timestamp);

    // Custom errors
    error UnexpectedRequestID(bytes32 requestId);
    error EmptySource();
    error EmptyArgs();

    // Request types
    string public constant REQUEST_TYPE_DAILY = "DAILY";
    string public constant REQUEST_TYPE_WEEKLY = "WEEKLY";
    string public constant REQUEST_TYPE_MONTHLY = "MONTHLY";
    string public constant REQUEST_TYPE_SEASONAL = "SEASONAL";
    string public constant REQUEST_TYPE_QUARTERLY = "QUARTERLY";
    string public constant REQUEST_TYPE_YEARLY = "YEARLY";
    string public constant REQUEST_TYPE_HEALTH = "HEALTH";

    // Router address - Hardcoded for Sepolia
    // Check to get the router address for your supported network https://docs.chain.link/chainlink-functions/supported-networks
    address router = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;

    // donID - Hardcoded for Sepolia
    // Check to get the donID for your supported network https://docs.chain.link/chainlink-functions/supported-networks
    bytes32 donID = 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;

    // Callback gas limit
    uint32 gasLimit = 300000;

    /**
     * @notice Initializes the contract with the Chainlink router address and sets the contract owner
     */
    constructor() FunctionsClient(router) ConfirmedOwner(msg.sender) {}

    /**
     * @notice Sends a request to Chainlink Functions to fetch box office data
     * @param source The JavaScript source code to execute
     * @param args The arguments to pass to the source code
     * @param subscriptionId The subscription ID for billing
     * @param requestType The type of request (DAILY, WEEKLY, MONTHLY, SEASONAL, QUARTERLY, YEARLY, HEALTH)
     * @return requestId The ID of the request
     */
    function sendRequest(
        string calldata source,
        string[] calldata args,
        uint64 subscriptionId,
        string calldata requestType
    ) external onlyOwner returns (bytes32 requestId) {
        if (bytes(source).length == 0) revert EmptySource();
        if (args.length == 0) revert EmptyArgs();

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);

        if (args.length > 0) req.setArgs(args);

        s_lastRequestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donID);
        
        // Store request metadata
        s_requestTypes[s_lastRequestId] = requestType;
        s_requestTimestamps[s_lastRequestId] = block.timestamp;

        emit RequestSent(s_lastRequestId, requestType, block.timestamp);
        
        return s_lastRequestId;
    }

    /**
     * @notice Callback function used by Functions oracle to return the response
     * @param requestId The request ID for fulfillment
     * @param response The response from the Functions oracle
     * @param err Any errors from the Functions oracle
     */
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (s_lastRequestId != requestId) {
            revert UnexpectedRequestID(requestId);
        }

        s_lastResponse = response;
        s_lastError = err;

        string memory requestType = s_requestTypes[requestId];
        uint256 timestamp = s_requestTimestamps[requestId];

        if (err.length > 0) {
            emit RequestFailed(requestId, requestType, string(err), timestamp);
            return;
        }

        // Decode the response based on request type
        uint256 decodedData = abi.decode(response, (uint256));
        
        // Store the data in the appropriate mapping
        if (keccak256(bytes(requestType)) == keccak256(bytes(REQUEST_TYPE_DAILY))) {
            s_dailyData[requestId] = decodedData;
        } else if (keccak256(bytes(requestType)) == keccak256(bytes(REQUEST_TYPE_WEEKLY))) {
            s_weeklyData[requestId] = decodedData;
        } else if (keccak256(bytes(requestType)) == keccak256(bytes(REQUEST_TYPE_MONTHLY))) {
            s_monthlyData[requestId] = decodedData;
        } else if (keccak256(bytes(requestType)) == keccak256(bytes(REQUEST_TYPE_SEASONAL))) {
            s_seasonalData[requestId] = decodedData;
        } else if (keccak256(bytes(requestType)) == keccak256(bytes(REQUEST_TYPE_QUARTERLY))) {
            s_quarterlyData[requestId] = decodedData;
        } else if (keccak256(bytes(requestType)) == keccak256(bytes(REQUEST_TYPE_YEARLY))) {
            s_yearlyData[requestId] = decodedData;
        } else if (keccak256(bytes(requestType)) == keccak256(bytes(REQUEST_TYPE_HEALTH))) {
            s_healthData[requestId] = decodedData;
        }

        emit RequestFulfilled(requestId, requestType, decodedData, timestamp);
    }

    /**
     * @notice Get the latest daily box office data for a specific request
     * @param requestId The request ID to get data for
     * @return The daily box office data (composite metric)
     */
    function getDailyData(bytes32 requestId) external view returns (uint256) {
        return s_dailyData[requestId];
    }

    /**
     * @notice Get the latest weekly box office data for a specific request
     * @param requestId The request ID to get data for
     * @return The weekly box office data (composite metric)
     */
    function getWeeklyData(bytes32 requestId) external view returns (uint256) {
        return s_weeklyData[requestId];
    }

    /**
     * @notice Get the latest monthly box office data for a specific request
     * @param requestId The request ID to get data for
     * @return The monthly box office data (composite metric)
     */
    function getMonthlyData(bytes32 requestId) external view returns (uint256) {
        return s_monthlyData[requestId];
    }

    /**
     * @notice Get the latest seasonal box office data for a specific request
     * @param requestId The request ID to get data for
     * @return The seasonal box office data (composite metric)
     */
    function getSeasonalData(bytes32 requestId) external view returns (uint256) {
        return s_seasonalData[requestId];
    }

    /**
     * @notice Get the latest quarterly box office data for a specific request
     * @param requestId The request ID to get data for
     * @return The quarterly box office data (composite metric)
     */
    function getQuarterlyData(bytes32 requestId) external view returns (uint256) {
        return s_quarterlyData[requestId];
    }

    /**
     * @notice Get the latest yearly box office data for a specific request
     * @param requestId The request ID to get data for
     * @return The yearly box office data (composite metric)
     */
    function getYearlyData(bytes32 requestId) external view returns (uint256) {
        return s_yearlyData[requestId];
    }

    /**
     * @notice Get the latest health status for a specific request
     * @param requestId The request ID to get data for
     * @return The health status (1 = healthy, 0 = unhealthy)
     */
    function getHealthData(bytes32 requestId) external view returns (uint256) {
        return s_healthData[requestId];
    }

    /**
     * @notice Decode box office data into its components
     * @param boxOfficeData The encoded box office data
     * @return movieCount Number of movies tracked
     * @return revenueThousands Revenue in thousands
     */
    function decodeBoxOfficeData(uint256 boxOfficeData) external pure returns (uint32 movieCount, uint256 revenueThousands) {
        movieCount = uint32(boxOfficeData & 0xFFFFFFFF);
        revenueThousands = (boxOfficeData >> 32);
        return (movieCount, revenueThousands);
    }

    /**
     * @notice Get request metadata
     * @param requestId The request ID to get metadata for
     * @return requestType The type of request
     * @return timestamp When the request was made
     */
    function getRequestMetadata(bytes32 requestId) external view returns (string memory requestType, uint256 timestamp) {
        return (s_requestTypes[requestId], s_requestTimestamps[requestId]);
    }

    /**
     * @notice Get the router address
     * @return The router address
     */
    function getRouter() external view returns (address) {
        return router;
    }

    /**
     * @notice Get the donID
     * @return The donID
     */
    function getDonID() external view returns (bytes32) {
        return donID;
    }
} 