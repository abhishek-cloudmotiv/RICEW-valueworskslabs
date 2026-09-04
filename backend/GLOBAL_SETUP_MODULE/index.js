const express = require('express');
const serverless = require('serverless-http');
const oracledb = require('oracledb');
const config = require('./config');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Oracle connection pool for Lambda reuse
async function initialize() {
  try {
    await oracledb.createPool(config.dbConfig);
    console.log('Oracle DB Pool Created Successfully');
  } catch (err) {
    console.error('Error creating Oracle pool: ' + err.message);
  }
}

// Start the pool immediately when the Lambda container starts (Cold Start optimization)
initialize();

// Fetch Application Suites
app.get('/suites', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT * FROM XX_GSM_APPLICATION_SUITE_MASTER`,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT } // Return rows as JSON objects
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Query Error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

// Fetch Process Streams (Joined with Suites)
app.get('/get/streamApplication', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const query = `
      SELECT 
        stream.PROCESS_STREAM_ID,
        stream.PROCESS_STREAM_NAME,
        stream.PROCESS_STREAM_CODE,
        suite.APPLICATION_SUITE_NAME
      FROM 
        XX_GSM_PROCESS_STREAM_MASTER stream
      JOIN 
        XX_GSM_APPLICATION_SUITE_MASTER suite 
        ON stream.APPLICATION_SUITE_ID = suite.APPLICATION_SUITE_ID
      ORDER BY 
        stream.PROCESS_STREAM_ID ASC
    `;
    const result = await connection.execute(
      query,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Query Error:', err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) { console.error(e); }
    }
  }
});

// Wrap the Express app with serverless-http to make it Lambda-compatible
module.exports.handler = serverless(app);

// Local Development Server
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running locally on http://localhost:${PORT}`);
    console.log(`   - http://localhost:${PORT}/suites`);
    console.log(`   - http://localhost:${PORT}/get/streamApplication`);
  });
}
