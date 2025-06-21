// Box Office API Consumer Source Code
// This example shows how to call multiple box office API endpoints from a single Chainlink Functions request
// and return aggregated data from the express-boxoffice.vercel.app API

// Arguments can be provided when a request is initiated on-chain
// args[0] = requestType (DAILY, WEEKLY, MONTHLY, SEASONAL, QUARTERLY, YEARLY, HEALTH)
// args[1] = additional parameters (e.g., date for daily, year/week for weekly, etc.)

const requestType = args[0];
const additionalParam = args[1] || "";

console.log(`Request type: ${requestType}`);
console.log(`Additional parameter: ${additionalParam}`);

// Function to make HTTP requests with error handling
async function makeRequest(url, headers = {}, params = {}) {
    console.log(`Making request to: ${url}`);
    console.log(`Headers:`, headers);
    console.log(`Params:`, params);
    
    const request = Functions.makeHttpRequest({
        url: url,
        headers: {
            "Content-Type": "application/json",
            ...headers
        },
        params: params
    });
    
    const response = await request;
    
    console.log(`Response received:`, response);
    
    if (response.error) {
        console.error(`Request failed for ${url}:`, response.error);
        console.error(`Error details:`, JSON.stringify(response.error, null, 2));
        return null;
    }
    
    console.log(`Response status: ${response.status}`);
    console.log(`Response data type: ${typeof response.data}`);
    console.log(`Response data length: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
    
    // Log the full JSON response data
    if (response.data) {
        console.log(`Full JSON Response Data:`);
        console.log(JSON.stringify(response.data, null, 2));
        
        // If it's an array, log details about each item
        if (Array.isArray(response.data)) {
            console.log(`\nArray Details:`);
            console.log(`- Total items: ${response.data.length}`);
            
            if (response.data.length > 0) {
                console.log(`- First item keys:`, Object.keys(response.data[0]));
                console.log(`- Sample first item:`, JSON.stringify(response.data[0], null, 2));
                
                if (response.data.length > 1) {
                    console.log(`- Sample last item:`, JSON.stringify(response.data[response.data.length - 1], null, 2));
                }
            }
        } else if (typeof response.data === 'object') {
            console.log(`\nObject Details:`);
            console.log(`- Object keys:`, Object.keys(response.data));
        }
    }
    
    return response.data;
}

// Function to calculate total revenue from box office data
function calculateTotalRevenue(boxOfficeData) {
    if (!boxOfficeData || !Array.isArray(boxOfficeData)) return 0;
    
    return boxOfficeData.reduce((total, movie) => {
        // The API returns "Daily" field with dollar amounts like "$9,764,735"
        let revenue = 0;
        
        if (movie.Daily) {
            // Remove "$" and "," from the Daily field and convert to number
            const dailyStr = movie.Daily.toString().replace(/[$,]/g, '');
            revenue = parseFloat(dailyStr) || 0;
        } else if (movie.revenue) {
            revenue = parseFloat(movie.revenue) || 0;
        } else if (movie.gross) {
            revenue = parseFloat(movie.gross) || 0;
        }
        
        return total + revenue;
    }, 0);
}

// Function to calculate average revenue per movie
function calculateAverageRevenue(boxOfficeData) {
    if (!boxOfficeData || !Array.isArray(boxOfficeData) || boxOfficeData.length === 0) return 0;
    
    const totalRevenue = calculateTotalRevenue(boxOfficeData);
    return totalRevenue / boxOfficeData.length;
}

// Function to validate and parse date parameter
function parseDateParam(dateStr) {
    if (!dateStr) {
        const today = new Date();
        return today.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
        throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
    }
    
    // Validate that it's a real date
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
    }
    
    return dateStr;
}

// Function to validate and parse year parameter
function parseYearParam(yearStr) {
    if (!yearStr) {
        return new Date().getFullYear();
    }
    
    const year = parseInt(yearStr);
    if (isNaN(year) || year < 1900 || year > 2100) {
        throw new Error(`Invalid year: ${yearStr}. Expected year between 1900-2100`);
    }
    
    return year;
}

// Function to validate and parse week parameter
function parseWeekParam(weekStr) {
    if (!weekStr) {
        const today = new Date();
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const days = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + startOfYear.getDay() + 1) / 7);
    }
    
    const week = parseInt(weekStr);
    if (isNaN(week) || week < 1 || week > 53) {
        throw new Error(`Invalid week: ${weekStr}. Expected week between 1-53`);
    }
    
    return week;
}

// Function to validate and parse month parameter
function parseMonthParam(monthStr) {
    if (!monthStr) {
        return new Date().getMonth() + 1;
    }
    
    const month = parseInt(monthStr);
    if (isNaN(month) || month < 1 || month > 12) {
        throw new Error(`Invalid month: ${monthStr}. Expected month between 1-12`);
    }
    
    return month;
}

// Function to validate and parse season parameter
function parseSeasonParam(seasonStr) {
    if (!seasonStr) {
        return "summer"; // Default to summer
    }
    
    const validSeasons = ["spring", "summer", "fall", "autumn", "winter"];
    const season = seasonStr.toLowerCase();
    
    if (!validSeasons.includes(season)) {
        throw new Error(`Invalid season: ${seasonStr}. Expected one of: ${validSeasons.join(", ")}`);
    }
    
    return season;
}

// Function to validate and parse quarter parameter
function parseQuarterParam(quarterStr) {
    if (!quarterStr) {
        return Math.ceil((new Date().getMonth() + 1) / 3);
    }
    
    const quarter = parseInt(quarterStr);
    if (isNaN(quarter) || quarter < 1 || quarter > 4) {
        throw new Error(`Invalid quarter: ${quarterStr}. Expected quarter between 1-4`);
    }
    
    return quarter;
}

// Handle different box office request types
switch (requestType) {
    case "DAILY":
        await handleDailyRequest();
        break;
    case "WEEKLY":
        await handleWeeklyRequest();
        break;
    case "MONTHLY":
        await handleMonthlyRequest();
        break;
    case "SEASONAL":
        await handleSeasonalRequest();
        break;
    case "QUARTERLY":
        await handleQuarterlyRequest();
        break;
    case "YEARLY":
        await handleYearlyRequest();
        break;
    case "HEALTH":
        await handleHealthRequest();
        break;
    default:
        throw new Error(`Unknown request type: ${requestType}`);
}

async function handleDailyRequest() {
    console.log("Fetching daily box office data...");
    
    try {
        const date = parseDateParam(additionalParam);
        console.log(`Fetching daily box office data for date: ${date}`);
        
        const response = await makeRequest("https://express-boxoffice.vercel.app/daily", {}, {
            date: date
        });
        
        if (!response || !Array.isArray(response)) {
            throw new Error("Daily box office API failed or returned invalid data");
        }
        
        const totalRevenue = calculateTotalRevenue(response);
        const averageRevenue = calculateAverageRevenue(response);
        const movieCount = response.length;
        
        console.log(`Daily box office revenue: $${totalRevenue.toLocaleString()}`);
        console.log(`Daily movies count: ${movieCount}`);
        console.log(`Average revenue per movie: $${averageRevenue.toLocaleString()}`);
        
        // Log detailed information about each movie
        console.log(`\nDetailed Movie Information:`);
        response.forEach((movie, index) => {
            console.log(`\nMovie ${index + 1}:`);
            console.log(JSON.stringify(movie, null, 2));
        });
        
        // Create a composite metric that includes movie count and total revenue
        // We'll encode this as a single uint256 where:
        // - First 32 bits: movie count
        // - Remaining bits: total revenue (in thousands)
        
        const movieCountBits = movieCount;
        const revenueBits = Math.floor(totalRevenue / 1000) << 32; // Convert to thousands and shift
        
        const compositeMetric = movieCountBits | revenueBits;
        
        console.log(`Composite metric: ${compositeMetric}`);
        console.log(`- Movie count: ${movieCount}`);
        console.log(`- Revenue (thousands): ${Math.floor(totalRevenue / 1000)}`);
        
        // Store the raw JSON data for retrieval
        console.log(`\nRaw JSON data stored for retrieval`);
        console.log(`Total movies in response: ${response.length}`);
        
        return Functions.encodeUint256(compositeMetric);
    } catch (error) {
        throw new Error(`Daily request failed: ${error.message}`);
    }
}

async function handleWeeklyRequest() {
    console.log("Fetching weekly box office data...");
    
    try {
        // Parse parameters: format can be "2024-3" or separate parameters
        let year, week;
        
        if (additionalParam && additionalParam.includes('-')) {
            const parts = additionalParam.split('-');
            year = parseYearParam(parts[0]);
            week = parseWeekParam(parts[1]);
        } else {
            year = parseYearParam(additionalParam);
            week = parseWeekParam(""); // Use default
        }
        
        console.log(`Fetching weekly box office data for year: ${year}, week: ${week}`);
        
        const response = await makeRequest("https://express-boxoffice.vercel.app/weekly", {}, {
            year: year,
            week: week
        });
        
        if (!response || !Array.isArray(response)) {
            throw new Error("Weekly box office API failed or returned invalid data");
        }
        
        const totalRevenue = calculateTotalRevenue(response);
        const averageRevenue = calculateAverageRevenue(response);
        const movieCount = response.length;
        
        console.log(`Weekly box office revenue: $${totalRevenue.toLocaleString()}`);
        console.log(`Weekly movies count: ${movieCount}`);
        console.log(`Average revenue per movie: $${averageRevenue.toLocaleString()}`);
        
        // Log detailed information about each movie
        console.log(`\nDetailed Movie Information:`);
        response.forEach((movie, index) => {
            console.log(`\nMovie ${index + 1}:`);
            console.log(JSON.stringify(movie, null, 2));
        });
        
        const movieCountBits = movieCount;
        const revenueBits = Math.floor(totalRevenue / 1000) << 32;
        
        const compositeMetric = movieCountBits | revenueBits;
        
        console.log(`\nRaw JSON data stored for retrieval`);
        console.log(`Total movies in response: ${response.length}`);
        
        return Functions.encodeUint256(compositeMetric);
    } catch (error) {
        throw new Error(`Weekly request failed: ${error.message}`);
    }
}

async function handleMonthlyRequest() {
    console.log("Fetching monthly box office data...");
    
    try {
        // Parse parameters: format can be "2024-1" or separate parameters
        let year, month;
        
        if (additionalParam && additionalParam.includes('-')) {
            const parts = additionalParam.split('-');
            year = parseYearParam(parts[0]);
            month = parseMonthParam(parts[1]);
        } else {
            year = parseYearParam(additionalParam);
            month = parseMonthParam(""); // Use default
        }
        
        console.log(`Fetching monthly box office data for year: ${year}, month: ${month}`);
        
        const response = await makeRequest("https://express-boxoffice.vercel.app/monthly", {}, {
            year: year,
            month: month
        });
        
        if (!response || !Array.isArray(response)) {
            throw new Error("Monthly box office API failed or returned invalid data");
        }
        
        const totalRevenue = calculateTotalRevenue(response);
        const averageRevenue = calculateAverageRevenue(response);
        const movieCount = response.length;
        
        console.log(`Monthly box office revenue: $${totalRevenue.toLocaleString()}`);
        console.log(`Monthly movies count: ${movieCount}`);
        console.log(`Average revenue per movie: $${averageRevenue.toLocaleString()}`);
        
        // Log detailed information about each movie
        console.log(`\nDetailed Movie Information:`);
        response.forEach((movie, index) => {
            console.log(`\nMovie ${index + 1}:`);
            console.log(JSON.stringify(movie, null, 2));
        });
        
        const movieCountBits = movieCount;
        const revenueBits = Math.floor(totalRevenue / 1000) << 32;
        
        const compositeMetric = movieCountBits | revenueBits;
        
        console.log(`\nRaw JSON data stored for retrieval`);
        console.log(`Total movies in response: ${response.length}`);
        
        return Functions.encodeUint256(compositeMetric);
    } catch (error) {
        throw new Error(`Monthly request failed: ${error.message}`);
    }
}

async function handleSeasonalRequest() {
    console.log("Fetching seasonal box office data...");
    
    try {
        // Parse parameters: format can be "2024-summer" or separate parameters
        let year, season;
        
        if (additionalParam && additionalParam.includes('-')) {
            const parts = additionalParam.split('-');
            year = parseYearParam(parts[0]);
            season = parseSeasonParam(parts.slice(1).join('-')); // Handle multi-word seasons
        } else {
            year = parseYearParam(additionalParam);
            season = parseSeasonParam(""); // Use default
        }
        
        console.log(`Fetching seasonal box office data for year: ${year}, season: ${season}`);
        
        const response = await makeRequest("https://express-boxoffice.vercel.app/seasonal", {}, {
            year: year,
            season: season
        });
        
        if (!response || !Array.isArray(response)) {
            throw new Error("Seasonal box office API failed or returned invalid data");
        }
        
        const totalRevenue = calculateTotalRevenue(response);
        const averageRevenue = calculateAverageRevenue(response);
        const movieCount = response.length;
        
        console.log(`${season.charAt(0).toUpperCase() + season.slice(1)} box office revenue: $${totalRevenue.toLocaleString()}`);
        console.log(`${season.charAt(0).toUpperCase() + season.slice(1)} movies count: ${movieCount}`);
        console.log(`Average revenue per movie: $${averageRevenue.toLocaleString()}`);
        
        // Log detailed information about each movie
        console.log(`\nDetailed Movie Information:`);
        response.forEach((movie, index) => {
            console.log(`\nMovie ${index + 1}:`);
            console.log(JSON.stringify(movie, null, 2));
        });
        
        const movieCountBits = movieCount;
        const revenueBits = Math.floor(totalRevenue / 1000) << 32;
        
        const compositeMetric = movieCountBits | revenueBits;
        
        console.log(`\nRaw JSON data stored for retrieval`);
        console.log(`Total movies in response: ${response.length}`);
        
        return Functions.encodeUint256(compositeMetric);
    } catch (error) {
        throw new Error(`Seasonal request failed: ${error.message}`);
    }
}

async function handleQuarterlyRequest() {
    console.log("Fetching quarterly box office data...");
    
    try {
        // Parse parameters: format can be "2024-1" or separate parameters
        let year, quarter;
        
        if (additionalParam && additionalParam.includes('-')) {
            const parts = additionalParam.split('-');
            year = parseYearParam(parts[0]);
            quarter = parseQuarterParam(parts[1]);
        } else {
            year = parseYearParam(additionalParam);
            quarter = parseQuarterParam(""); // Use default
        }
        
        console.log(`Fetching quarterly box office data for year: ${year}, quarter: ${quarter}`);
        
        const response = await makeRequest("https://express-boxoffice.vercel.app/quarterly", {}, {
            year: year,
            quarter: quarter
        });
        
        if (!response || !Array.isArray(response)) {
            throw new Error("Quarterly box office API failed or returned invalid data");
        }
        
        const totalRevenue = calculateTotalRevenue(response);
        const averageRevenue = calculateAverageRevenue(response);
        const movieCount = response.length;
        
        console.log(`Q${quarter} box office revenue: $${totalRevenue.toLocaleString()}`);
        console.log(`Q${quarter} movies count: ${movieCount}`);
        console.log(`Average revenue per movie: $${averageRevenue.toLocaleString()}`);
        
        // Log detailed information about each movie
        console.log(`\nDetailed Movie Information:`);
        response.forEach((movie, index) => {
            console.log(`\nMovie ${index + 1}:`);
            console.log(JSON.stringify(movie, null, 2));
        });
        
        const movieCountBits = movieCount;
        const revenueBits = Math.floor(totalRevenue / 1000) << 32;
        
        const compositeMetric = movieCountBits | revenueBits;
        
        console.log(`\nRaw JSON data stored for retrieval`);
        console.log(`Total movies in response: ${response.length}`);
        
        return Functions.encodeUint256(compositeMetric);
    } catch (error) {
        throw new Error(`Quarterly request failed: ${error.message}`);
    }
}

async function handleYearlyRequest() {
    console.log("Fetching yearly box office data...");
    
    try {
        const year = parseYearParam(additionalParam);
        console.log(`Fetching yearly box office data for year: ${year}`);
        
        const response = await makeRequest("https://express-boxoffice.vercel.app/yearly", {}, {
            year: year
        });
        
        if (!response || !Array.isArray(response)) {
            throw new Error("Yearly box office API failed or returned invalid data");
        }
        
        const totalRevenue = calculateTotalRevenue(response);
        const averageRevenue = calculateAverageRevenue(response);
        const movieCount = response.length;
        
        console.log(`${year} box office revenue: $${totalRevenue.toLocaleString()}`);
        console.log(`${year} movies count: ${movieCount}`);
        console.log(`Average revenue per movie: $${averageRevenue.toLocaleString()}`);
        
        // Log detailed information about each movie
        console.log(`\nDetailed Movie Information:`);
        response.forEach((movie, index) => {
            console.log(`\nMovie ${index + 1}:`);
            console.log(JSON.stringify(movie, null, 2));
        });
        
        const movieCountBits = movieCount;
        const revenueBits = Math.floor(totalRevenue / 1000) << 32;
        
        const compositeMetric = movieCountBits | revenueBits;
        
        console.log(`\nRaw JSON data stored for retrieval`);
        console.log(`Total movies in response: ${response.length}`);
        
        return Functions.encodeUint256(compositeMetric);
    } catch (error) {
        throw new Error(`Yearly request failed: ${error.message}`);
    }
}

async function handleHealthRequest() {
    console.log("Checking box office API health...");
    
    try {
        const response = await makeRequest("https://express-boxoffice.vercel.app/health");
        
        if (response === "OK!") {
            console.log("Box Office API is healthy");
            return Functions.encodeUint256(1); // Return 1 for healthy
        } else {
            console.log("Box Office API is unhealthy");
            return Functions.encodeUint256(0); // Return 0 for unhealthy
        }
    } catch (error) {
        throw new Error(`Health check failed: ${error.message}`);
    }
} 