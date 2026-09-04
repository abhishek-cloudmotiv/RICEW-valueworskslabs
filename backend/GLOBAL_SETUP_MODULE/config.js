// Load environment variables for local testing
// In AWS Lambda, these are provided through the Lambda Configuration settings
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  dbConfig: {
    user: process.env.RDS_DB_USER,
    password: process.env.RDS_DB_PASSWORD,
    connectString: `${process.env.RDS_DB_HOST}:${process.env.RDS_DB_PORT}/${process.env.RDS_DB_SERVICE_NAME}`,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1
  }
};
