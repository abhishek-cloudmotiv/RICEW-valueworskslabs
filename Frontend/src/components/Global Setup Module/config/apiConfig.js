const GLOBAL_SETUP_API_CONFIG = {
  PROCESS_STREAM_API_URL: 'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/allMasterProcessStreams',
  CLOUD_MODULES_API_URL: 'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/allMasterApplicationModules',
  PROCESS_AREAS_L0_API_URL: 'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/allProcessL0',
  HIERARCHY_BATCH_API_URLS: [
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch1',
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch2',
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch3',
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch4',
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch5',
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch6',
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch7',
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch8',
    'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/allProcessHierarchy/get/batch9'
  ],
  ROLE_DEFINITION_API_URLS: {
    GET: 'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/get/rice-role-definition',
    POST: 'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/post/rice-role-definition',
    DELETE: 'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/delete/rice-role-definition'
  },
  GEOGRAPHY_API_URL: 'https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/listOfGeography',
  INDUSTRIES_API_URL: 'https://ec2450jptj.execute-api.ap-south-1.amazonaws.com/New/rice/get/industries',
  LEVEL_DEFINITION_API_URL: 'https://vkq1k9mnu2.execute-api.ap-south-1.amazonaws.com/new/rice/get/level-definition',
  ONBOARDING_STATUS_API_URL: 'https://0l08fng4tg.execute-api.ap-south-1.amazonaws.com/new/organization/onboarding-status/get',
  LOCATION_DEFINITION_API_URL: 'https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/organization/location/get',
  BILLING_STATUS_API_URL: 'https://vs7ws23ybl.execute-api.ap-south-1.amazonaws.com/rice/organization/billing-status/get',
  CONFIG_API_URL: 'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/objectTypeByProject',
  RICEW_STATUS_API_URL: 'https://047kqyev3f.execute-api.ap-south-1.amazonaws.com/New/ricew/ricewstatus/get',
  CATEGORY_SUBCATEGORY_API_URL: 'https://35j96p30rd.execute-api.ap-south-1.amazonaws.com/New/ricew/categorySubcategory/getRecords',
  RISK_ISSUES_SEVERITY_API_URL: 'https://35j96p30rd.execute-api.ap-south-1.amazonaws.com/New/ricew/riskIssuesSeverity/getRecords',
  EMPLOYMENT_TYPES_API_URL: 'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/employmentTypes',
  ORACLE_APPLICATION_PROCESS_STREAM_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/streamApplication',
  PROCESS_STREAM_ORACLE_APPLICATION_API_URL: 'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/processStreamOracleApplication',
  PROCESS_STREAM_L0_L1_L2_L3_API_URL: 'https://tuo1xmg14d.execute-api.ap-south-1.amazonaws.com/New/rice/get/processStreamL0L1L2L3'
};

export default GLOBAL_SETUP_API_CONFIG;
