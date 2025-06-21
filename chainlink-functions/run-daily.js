const { requestDailyData } = require('./request.js');

// Get the date from command line arguments
const date = process.argv[2] || '';

console.log(`Running daily request with date: ${date || 'current date'}`);

requestDailyData(date)
  .then(() => {
    console.log('Request completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Request failed:', error);
    process.exit(1);
  }); 