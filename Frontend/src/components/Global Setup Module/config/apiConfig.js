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
    GET: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/projectRoles',
    POST: 'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/post/rice-role-definition',
    DELETE: 'https://m4wh3q1onb.execute-api.ap-south-1.amazonaws.com/New/api/delete/rice-role-definition'
  },
  GEOGRAPHY_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/geographies',
  INDUSTRIES_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/IndustryListDetails',
  LEVEL_DEFINITION_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/resourceLevels',
  ONBOARDING_STATUS_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/onboardingStatus',
  LOCATION_DEFINITION_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/ResourceLocationDetails',
  BILLING_STATUS_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/BillingStatusDetails',
  CONFIG_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/objectTypes',
  RICEW_STATUS_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/ricewStatus',
  CATEGORY_SUBCATEGORY_API_URL: 'https://35j96p30rd.execute-api.ap-south-1.amazonaws.com/New/ricew/categorySubcategory/getRecords',
  RISK_ISSUES_SEVERITY_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/RiskIssuesSeverityDetails',
  EMPLOYMENT_TYPES_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/EmploymentTypeDetails',
  ORACLE_APPLICATION_PROCESS_STREAM_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/streamApplication',
  PROCESS_STREAM_ORACLE_APPLICATION_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/moduleStreamMap',
  PROCESS_STREAM_L0_L1_L2_L3_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/l1l2l3Details',
  DATA_MIGRATION_API_URL: 'https://n5i1mqmg8a.execute-api.ap-south-1.amazonaws.com/GLOBAL_SETUP_MODULE/get/conversionObjects'
};

export default GLOBAL_SETUP_API_CONFIG;
