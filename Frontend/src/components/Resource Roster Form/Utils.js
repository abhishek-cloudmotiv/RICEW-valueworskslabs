// Utility Functions
import DOMPurify from 'dompurify';

export const parseDateForAPI = (displayDate) => {
  if (!displayDate) return '';
  // Expected format: dd-mmm-yyyy
  const parts = displayDate.split('-');
  if (parts.length !== 3) return '';
  const day = parseInt(parts[0], 10);
  const monthName = parts[1];
  const year = parseInt(parts[2], 10);

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames.indexOf(monthName.toUpperCase());
  if (month === -1 || isNaN(day) || isNaN(year)) return '';

  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return '';
  return `${year.toString().padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // Return YYYY-MM-DD format
};

// Function to map API response to form data structure
export const mapApiResponseToFormData = (apiData) => {
  // Normalize phone code - ensure it has the + prefix
  let phoneCode = apiData.IC_primary_phone_no_code || '';
  if (phoneCode && !phoneCode.startsWith('+')) {
    phoneCode = '+' + phoneCode;
  }

  return {
    resourceRosterId: DOMPurify.sanitize(apiData.Resource_Roster_Form_id || '', { ALLOWED_TAGS: [] }),
    organizationName: DOMPurify.sanitize(apiData.IC_organization_name || apiData.Organization_Name || '', { ALLOWED_TAGS: [] }),
    businessLine: DOMPurify.sanitize(apiData.IC_business_line_name || '', { ALLOWED_TAGS: [] }),
    portfolioName: DOMPurify.sanitize(apiData.IC_portfolio_name || '', { ALLOWED_TAGS: [] }),
    serviceLineName: DOMPurify.sanitize(apiData.IC_service_line_name || '', { ALLOWED_TAGS: [] }),
    fullName: DOMPurify.sanitize(apiData.IC_full_name || apiData.Full_Name || '', { ALLOWED_TAGS: [] }),
    emailAddress: DOMPurify.sanitize(apiData.IC_email || apiData.Email_Address || '', { ALLOWED_TAGS: [] }),
    code: DOMPurify.sanitize(phoneCode, { ALLOWED_TAGS: [] }),
    phoneNumber: DOMPurify.sanitize(apiData.IC_phone || '', { ALLOWED_TAGS: [] }),
    employmentType: DOMPurify.sanitize(apiData.IC_employment_type || '', { ALLOWED_TAGS: [] }),
    workLocation: DOMPurify.sanitize(apiData.IC_work_location || '', { ALLOWED_TAGS: [] }),
    nationality: DOMPurify.sanitize(apiData.IC_nationality || '', { ALLOWED_TAGS: [] }),
    processStream: DOMPurify.sanitize(apiData.ER_process_stream || apiData.ER_Process_Stream || apiData.process_stream || apiData.Process_Stream || apiData.processStream || apiData.ER_Process_stream || '', { ALLOWED_TAGS: [] }),
    application: DOMPurify.sanitize(apiData.ER_application || '', { ALLOWED_TAGS: [] }),
    primaryRole: DOMPurify.sanitize(apiData.ER_primary_role || apiData.Primary_Role || '', { ALLOWED_TAGS: [] }),
    resourceLevel: DOMPurify.sanitize(apiData.ER_resource_level || apiData.Resource_Level || '', { ALLOWED_TAGS: [] }),
    onboardingStatus: DOMPurify.sanitize(apiData.ER_onboarding_status || '', { ALLOWED_TAGS: [] }),
    startDate: DOMPurify.sanitize(apiData.ER_start_date || '', { ALLOWED_TAGS: [] }),
    endDate: DOMPurify.sanitize(apiData.ER_end_date || '', { ALLOWED_TAGS: [] }),
    allocationPercent: DOMPurify.sanitize(apiData.SA_allocation_percentage || '', { ALLOWED_TAGS: [] }),
    hoursPerWeek: DOMPurify.sanitize(apiData.SA_hours_per_week || '', { ALLOWED_TAGS: [] }),
    workArrangement: DOMPurify.sanitize(apiData.SA_remote_onsite_hybrid || '', { ALLOWED_TAGS: [] }),
    billingStatus: DOMPurify.sanitize(apiData.BC_billability_status || '', { ALLOWED_TAGS: [] }),
    billingStartDate: DOMPurify.sanitize(apiData.BC_billing_start_date || '', { ALLOWED_TAGS: [] }),
    rateCard: DOMPurify.sanitize(apiData.BC_rate_card ? apiData.BC_rate_card.split(' ')[1] || apiData.BC_rate_card : '', { ALLOWED_TAGS: [] }),
    currency: DOMPurify.sanitize(apiData.BC_rate_card ? apiData.BC_rate_card.split(' ')[0] || '' : '', { ALLOWED_TAGS: [] }),
    rateAmount: DOMPurify.sanitize(apiData.rate_Amount || '', { ALLOWED_TAGS: [] }),
    resourceComment: DOMPurify.sanitize(apiData.resource_comment || '', { ALLOWED_TAGS: [] }),
    grantAccess: DOMPurify.sanitize(apiData.Grant_Access || 'false', { ALLOWED_TAGS: [] })
  };
};

// Constants
export const defaultFormData = {
  resourceRosterId: '',
  organizationName: '',
  businessLine: '',
  portfolioName: '',
  serviceLineName: '',
  fullName: '',
  emailAddress: '',
  code: '',
  phoneNumber: '',
  employmentType: '',
  workLocation: '',
  nationality: '',
  processStream: '',
  application: '',
  primaryRole: '',
  resourceLevel: '',
  onboardingStatus: '',
  startDate: '',
  endDate: '',
  allocationPercent: '',
  hoursPerWeek: '',
  workArrangement: '',
  billingStatus: '',
  billingStartDate: '',
  rateCard: '',
  currency: '',
  rateAmount: '',
  resourceComment: '',
  grantAccess: 'false'
};

export const textFieldStyle = {
  '& .MuiInputBase-root': {
    backgroundColor: 'white',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  '& .MuiInputBase-input': {
    padding: '6px 10px',
    fontSize: '13px',
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#ddd',
      borderRadius: '4px',
    },
    '&:hover fieldset': {
      borderColor: '#ddd',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#007bff',
      borderWidth: '1px',
    },
  },
  '& .MuiInputLabel-root': {
    display: 'none',
  },
};

export const labelStyle = {
  fontSize: '13px',
  fontWeight: '500',
  color: '#1f2937',
  marginRight: '2px',
  whiteSpace: 'nowrap'
};

export const sectionHeaderStyle = {
  backgroundColor: '#f8f9fa',
  padding: '8px 16px',
  borderBottom: '1px solid #dee2e6',
  fontSize: '13px',
  fontWeight: '600',
  color: '#333'
};
