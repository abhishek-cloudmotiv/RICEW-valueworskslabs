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

app.get('/get/moduleStreamMap', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        m.ORACLE_MODULE_ID,
        m.MODULE_CODE,
        m.MODULE_NAME,
        m.MODULE_DESC,
        m.PROCESS_STREAM_ID,
        ps.PROCESS_STREAM_NAME
      FROM XX_GSM_ORACLE_MODULE_MASTER m
      LEFT JOIN XX_GSM_PROCESS_STREAM_MASTER ps
        ON m.PROCESS_STREAM_ID = ps.PROCESS_STREAM_ID
      ORDER BY m.ORACLE_MODULE_ID ASC`,
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

// Fetch Project Roles with Category and Type Details
app.get('/get/projectRoles', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        pr.PROJECT_ROLE_ID,
        pr.PROJECT_ROLE_CODE,
        pr.PROJECT_ROLE_TITLE,
        pr.PROJECT_ROLE_DESCRIPTION,
        pr.ROLE_CATEGORY_ID,
        rc.ROLE_CATEGORY_NAME,
        pr.ROLE_TYPE_ID,
        rt.ROLE_TYPE_NAME
      FROM XX_GSM_PROJECT_ROLE_MASTER pr
      LEFT JOIN XX_GSM_ROLE_CATEGORY_MASTER rc
        ON pr.ROLE_CATEGORY_ID = rc.ROLE_CATEGORY_ID
      LEFT JOIN XX_GSM_ROLE_TYPE_MASTER rt
        ON pr.ROLE_TYPE_ID = rt.ROLE_TYPE_ID
      ORDER BY pr.PROJECT_ROLE_ID ASC`,
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

// Fetch L3, L2, L1, and Process Stream Details
app.get('/get/l1l2l3Details', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const query = `
      SELECT 
        l3.L3_ID,
        l3.L3_NAME,
        l2.L2_ID,
        l2.L2_NAME,
        l1.L1_ID,
        l1.L1_NAME,
        ps.PROCESS_STREAM_ID,
        ps.PROCESS_STREAM_NAME
      FROM 
        XX_GSM_L3_MASTER l3
      JOIN 
        XX_GSM_L2_MASTER l2 ON l3.L2_ID = l2.L2_ID
      JOIN 
        XX_GSM_L1_MASTER l1 ON l2.L1_ID = l1.L1_ID
      JOIN 
        XX_GSM_PROCESS_STREAM_MASTER ps ON l1.PROCESS_STREAM_ID = ps.PROCESS_STREAM_ID
      ORDER BY 
        l3.L3_ID ASC
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

// Fetch Geography List
app.get('/get/geographies', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        LIST_OF_GEOGRAPHY_ID,
        LIST_OF_GEOGRAPHY_DISPLAY_ID,
        GEO_CODE,
        REGION_NAME,
        DESCRIPTION
      FROM XX_GSM_LIST_OF_GEOGRAPHY_MASTER
      ORDER BY LIST_OF_GEOGRAPHY_ID ASC`,
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

// Fetch Countries with Geography Details
app.get('/get/countries', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        c.LIST_OF_COUNTRIES_ID,
        c.COUNTRY_CODE,
        c.COUNTRY_NAME,
        c.PHONE_CODE,
        c.CURRENCY_CODE,
        c.CURRENCY_NAME,
        c.LIST_OF_GEOGRAPHY_ID,
        g.GEO_CODE
      FROM XX_GSM_LIST_OF_COUNTRIES_MASTER c
      LEFT JOIN XX_GSM_LIST_OF_GEOGRAPHY_MASTER g
        ON c.LIST_OF_GEOGRAPHY_ID = g.LIST_OF_GEOGRAPHY_ID
      ORDER BY c.LIST_OF_COUNTRIES_ID ASC`,
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

// Fetch Resource Levels
app.get('/get/resourceLevels', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        RESOURCE_LEVEL_ID,
        RESOURCE_LEVEL_CODE,
        RESOURCE_LEVEL_SHORT_CODE,
        RESOURCE_LEVEL_TITLE,
        RESOURCE_LEVEL_DESCRIPTION
      FROM XX_GSM_RESOURCE_LEVEL_MASTER
      ORDER BY RESOURCE_LEVEL_ID ASC`,
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

// Fetch Onboarding Status
app.get('/get/onboardingStatus', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        ONBOARDING_STATUS_ID,
        ONBOARDING_STATUS,
        ONBOARDING_STATUS_DISPLAY_ID,
        ONBOARDING_STATUS_DESCRIPTION
      FROM XX_GSM_ONBOARDING_STATUS_MASTER
      ORDER BY ONBOARDING_STATUS_ID ASC`,
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

// Fetch industry list details:Sub-Sector, Sector, and Industry Details
app.get('/get/IndustryListDetails', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const query = `
      SELECT 
        sub.SUB_SECTOR_ID,
        sub.DISPLAY_ID AS SUB_SECTOR_DISPLAY_ID,
        sub.SUB_SECTOR_NAME,
        sub.SUB_SECTOR_CODE,
        sec.SECTOR_ID,
        sec.DISPLAY_ID AS SECTOR_DISPLAY_ID,
        sec.SECTOR_NAME,
        sec.SECTOR_CODE,
        ind.INDUSTRY_ID,
        ind.DISPLAY_ID AS INDUSTRY_DISPLAY_ID,
        ind.INDUSTRY_NAME,
        ind.INDUSTRY_CODE
      FROM 
        XX_GSM_SUB_SECTOR_MASTER sub
      JOIN 
        XX_GSM_SECTOR_MASTER sec ON sub.SECTOR_ID = sec.SECTOR_ID
      JOIN 
        XX_GSM_INDUSTRY_MASTER ind ON sec.INDUSTRY_ID = ind.INDUSTRY_ID
      ORDER BY 
        sub.SUB_SECTOR_ID ASC
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

// Fetch Resource Location Master Details
app.get('/get/ResourceLocationDetails', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const query = `
      SELECT 
        LOCATION_DEFINITION_ID,
        LOCATION,
        DEFINITION,
        LD_DISPLAY_ID
      FROM 
        XX_GSM_RESOURCE_LOCATION_MASTER
      ORDER BY 
        LOCATION_DEFINITION_ID ASC
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

// Fetch Billing Status Details
app.get('/get/BillingStatusDetails', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const query = `
      SELECT 
        BILLING_STATUS_DEFINITION_ID,
        BILLING_STATUS,
        DESCRIPTION
      FROM 
        XX_GSM_BILLING_STATUS_MASTER
      ORDER BY 
        BILLING_STATUS_DEFINITION_ID ASC
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

app.get('/get/objectTypes', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        OBJECT_TYPE_ID,
        OBJECT_CODE,
        OBJECT_TYPE,
        DESCRIPTION,
        VALUE_TYPE,
        DELETE_STATUS
      FROM XX_GSM_RICEW_OBJECT_TYPE_MASTER
      ORDER BY OBJECT_TYPE_ID ASC`,
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

// Fetch Employment Type Details
app.get('/get/EmploymentTypeDetails', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const query = `
      SELECT 
        EMPLOYMENT_TYPE_ID,
        EMPLOYMENT_TYPE,
        EMPLOYMENT_TYPE_DESCRIPTION
      FROM 
        XX_GSM_EMPLOYMENT_TYPE_MASTER
      ORDER BY 
        EMPLOYMENT_TYPE_ID ASC
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

app.get('/get/ricewStatus', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        RICEW_STATUS_ID,
        STATUS_CODE,
        STATUS_NAME,
        STATUS_DESCRIPTION,
        SYSTEM_DEFAULT,
        DELETE_STATUS
      FROM XX_GSM_RICEW_STATUS_MASTER
      ORDER BY RICEW_STATUS_ID ASC`,
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

// Fetch Risk Issues Severity Details
app.get('/get/RiskIssuesSeverityDetails', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const query = `
      SELECT 
        RISK_ISSUES_SEVERITY_ID,
        SEVERITY_CODE,
        SEVERITY_LEVEL,
        SEVERITY_DEFINITION,
        SYSTEM_DEFAULT,
        CREATED_BY,
        CREATED_TIMESTAMP,
        UPDATED_BY,
        UPDATED_TIMESTAMP
      FROM 
        XX_GSM_RISK_ISSUES_SEVERITY_MASTER
      ORDER BY 
        RISK_ISSUES_SEVERITY_ID ASC
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

// Fetch Conversion Objects with Process Stream Details
app.get('/get/conversionObjects', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const result = await connection.execute(
      `SELECT
        c.CONVERSION_OBJECT_ID,
        c.CLASSIFICATION,
        c.CONVERSION_OBJECT,
        c.TYPICAL_CONVERSION,
        c.PROCESS_STREAM_ID,
        ps.PROCESS_STREAM_NAME
      FROM XX_GSM_CONVERSION_OBJECT_MASTER c
      LEFT JOIN XX_GSM_PROCESS_STREAM_MASTER ps
        ON c.PROCESS_STREAM_ID = ps.PROCESS_STREAM_ID
      ORDER BY c.CONVERSION_OBJECT_ID ASC`,
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

// Fetch Activity Subcategory Details
app.get('/get/ActivitySubcategoryDetails', async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection();
    const query = `
      SELECT 
        sub.SUBCATEGORY_ID,
        sub.SUBCATEGORY_NAME,
        sub.SUBCATEGORY_CODE,
        sub.DELETE_STATUS AS SUB_DELETE_STATUS,
        sub.SYSTEM_DEFAULT AS SUB_SYSTEM_DEFAULT,
        cat.CATEGORY_ID,
        cat.CATEGORY_CODE,
        cat.CATEGORY_NAME
      FROM 
        XX_GSM_ACTIVITY_SUBCATEGORY_MASTER sub
      JOIN 
        XX_GSM_ACTIVITY_CATEGORY_MASTER cat ON sub.CATEGORY_ID = cat.CATEGORY_ID
      ORDER BY 
        sub.SUBCATEGORY_ID ASC
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
    console.log(`   - http://localhost:${PORT}/get/l1l2l3Details`);
  });
}
