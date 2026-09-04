import React, { useState, useEffect } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { Info } from 'lucide-react';
import DOMPurify from 'dompurify';
import { OrganizationAutocomplete, FullNameAutocomplete, PhoneCodeAutocomplete, EmploymentTypeAutocomplete, WorkLocationAutocomplete, NationalityAutocomplete, ProcessStreamAutocomplete, ApplicationAutocomplete, WorkArrangementAutocomplete, BillabilityStatusAutocomplete, OnboardingStatusAutocomplete, ResourceLevelAutocomplete, PrimaryRoleAutocomplete, ServiceLineAutocomplete, BusinessLineAutocomplete, PortfolioAutocomplete } from './AutocompleteComponents';
import { CustomDatePicker } from './Components';
import { textFieldStyle, labelStyle, sectionHeaderStyle } from './Utils';

// Identification and Contact Information Section
export const IdentificationContactSection = ({
  formData,
  handleChange,
  validateEmailField,
  validatePhoneField,
  organizationOptions,
  fullNameOptions,
  phoneCodeOptions,
  countryOptions,
  serviceLineOptions,
  businessLineOptions,
  portfolioOptions,
  fieldErrors,
  setFieldErrors,
  isEditMode = false,
  onResourceChange
}) => (
  <div style={{
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    marginBottom: '1rem',
    overflow: 'visible'
  }}>
    <div style={sectionHeaderStyle}>
      Identification and Contact Information
    </div>
    <div style={{ padding: '12px 16px', overflow: 'visible' }}>
      {/* Row 1 */}
      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'nowrap', gap: '4px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '130px', marginRight: '2px' }}>Organization Name <span style={{ color: 'red' }}>*</span></label>
            <OrganizationAutocomplete
              key="organization-autocomplete"
              value={formData.organizationName}
              onChange={(value) => {
                handleChange({ target: { name: 'organizationName', value } });
              }}
              options={organizationOptions}
              error={!!fieldErrors?.organizationName}
            />
          </div>
          {fieldErrors?.organizationName && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.organizationName, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '105px', marginRight: '2px', marginLeft: '10px' }}>Business Line</label>
            <BusinessLineAutocomplete
              key="business-line-autocomplete"
              value={formData.businessLine}
              onChange={(value) => {
                handleChange({ target: { name: 'businessLine', value } });
              }}
              options={businessLineOptions}
              error={!!fieldErrors?.businessLine}
            />
          </div>
          {fieldErrors?.businessLine && (
            <div style={{
              marginTop: '4px',
              marginLeft: '120px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.businessLine, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '100px', marginRight: '2px', marginLeft: '10px' }}>Portfolio Name</label>
            <PortfolioAutocomplete
              key="portfolio-autocomplete"
              value={formData.portfolioName}
              onChange={(value) => {
                handleChange({ target: { name: 'portfolioName', value } });
              }}
              options={portfolioOptions}
              error={!!fieldErrors?.portfolioName}
            />
          </div>
          {fieldErrors?.portfolioName && (
            <div style={{
              marginTop: '4px',
              marginLeft: '105px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.portfolioName, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '130px', marginRight: '2px', marginLeft: '10px' }}>Service Line Name</label>
            <ServiceLineAutocomplete
              key="service-line-autocomplete"
              value={formData.serviceLineName}
              onChange={(value) => {
                handleChange({ target: { name: 'serviceLineName', value } });
              }}
              options={serviceLineOptions}
              error={!!fieldErrors?.serviceLineName}
            />
          </div>
          {fieldErrors?.serviceLineName && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.serviceLineName, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '70px', marginRight: '62px' }}>Full Name <span style={{ color: 'red' }}>*</span></label>
            {isEditMode ? (
              <FullNameAutocomplete
                key="full-name-autocomplete"
                value={formData.fullName}
                onChange={(value) => {
                  handleChange({ target: { name: 'fullName', value } });
                }}
                options={fullNameOptions}
                error={!!fieldErrors?.fullName}
                setFieldErrors={setFieldErrors}
                resourceRosterId={formData.resourceRosterId}
                onResourceChange={onResourceChange}
              />
            ) : (
              <TextField
                name="fullName"
                value={formData.fullName}
                onChange={(e) => {
                  const value = e.target.value;

                  // Check character limit first
                  if (value.length > 100) {
                    setFieldErrors(prev => ({
                      ...prev,
                      fullName: 'Full Name cannot exceed 100 characters'
                    }));
                    return; // Block input if it exceeds 100 characters
                  } else {
                    // Clear the error if character count is within limit
                    if (fieldErrors?.fullName === 'Full Name cannot exceed 100 characters') {
                      setFieldErrors(prev => ({
                        ...prev,
                        fullName: ''
                      }));
                    }
                  }

                  // Validate against legalName pattern: letters, numbers, spaces, and & - . , ' ( ) /
                  const legalNameRegex = /^[a-zA-Z0-9\s&\-.,\'()\/]*$/;
                  if (legalNameRegex.test(value)) {
                    handleChange(e);
                  }
                  // If validation fails, don't update the value
                }}
                maxLength={100}
                size="small"
                error={!!fieldErrors?.fullName}
                sx={{
                  mr: '0px',
                  ml: '2px',
                  width: '180px',
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
                      borderRadius: '3px',
                    },
                    '&:hover fieldset': {
                      borderColor: '#ddd',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#ddd',
                      borderWidth: '1px',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    display: 'none',
                  },
                }}
              />
            )}
          </div>
          {fieldErrors?.fullName && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.fullName, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '105px', marginLeft: '10px' }}>Email Address <span style={{ color: 'red' }}>*</span></label>
            <TextField
              name="emailAddress"
              value={formData.emailAddress}
              onChange={(e) => {
                const value = e.target.value;

                // Check character limit first
                if (value.length > 100) {
                  setFieldErrors(prev => ({
                    ...prev,
                    emailAddress: 'Email Address cannot exceed 100 characters'
                  }));
                  return; // Block input if it exceeds 100 characters
                } else {
                  // Clear the error if character count is within limit
                  if (fieldErrors?.emailAddress === 'Email Address cannot exceed 100 characters') {
                    setFieldErrors(prev => ({
                      ...prev,
                      emailAddress: ''
                    }));
                  }
                }

                // Update the form data
                handleChange(e);

                // Clear any existing email error when user starts typing
                if (fieldErrors?.emailAddress) {
                  // The handleChange function will clear field errors automatically
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                // Validate email format on blur only if not exceeding character limit
                if (value.length <= 100 && validateEmailField) {
                  validateEmailField(value);
                }
              }}
              maxLength={100}
              size="small"
              error={!!fieldErrors?.emailAddress}
              sx={{
                mr: '10px',
                width: '180px',
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
                    borderRadius: '3px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#ddd',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#ddd',
                    borderWidth: '1px',
                  },
                },
                '& .MuiInputLabel-root': {
                  display: 'none',
                },
              }}
            />
          </div>
          {fieldErrors?.emailAddress && (
            <div style={{
              marginTop: '4px',
              marginLeft: '115px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.emailAddress, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '50px' }}>Code</label>
            <PhoneCodeAutocomplete
              key="phone-code-autocomplete"
              value={formData.code}
              onChange={(value) => {
                handleChange({ target: { name: 'code', value } });
              }}
              options={phoneCodeOptions}
              error={!!fieldErrors?.code}
            />
          </div>
          {fieldErrors?.code && (
            <div style={{
              marginTop: '4px',
              marginLeft: '55px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.code, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '100px', marginLeft: '10px' }}>Phone Number</label>
            <TextField
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow digits and limit to 10 digits
                const digitsOnly = value.replace(/\D/g, '');
                const limitedValue = digitsOnly.substring(0, 10);

                // Update the form data with the limited value
                handleChange({ target: { name: 'phoneNumber', value: limitedValue } });

                // Clear any existing phone error when user starts typing
                if (fieldErrors?.phoneNumber) {
                  // The handleChange function will clear field errors automatically
                }
              }}
              onBlur={(e) => {
                const value = e.target.value;
                // Validate phone format on blur
                if (validatePhoneField) {
                  validatePhoneField(value);
                }
              }}
              size="small"
              error={!!fieldErrors?.phoneNumber}
              sx={{
                mr: '10px',
                width: '180px',
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
                    borderRadius: '3px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#ddd',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#ddd',
                    borderWidth: '1px',
                  },
                },
                '& .MuiInputLabel-root': {
                  display: 'none',
                },
              }}
            />
          </div>
          {fieldErrors?.phoneNumber && (
            <div style={{
              marginTop: '4px',
              marginLeft: '115px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.phoneNumber, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '130px' }}>Employment Type</label>
            <EmploymentTypeAutocomplete
              key="employment-type-autocomplete"
              value={formData.employmentType}
              onChange={(value) => {
                handleChange({ target: { name: 'employmentType', value } });
              }}
              error={!!fieldErrors?.employmentType}
            />
          </div>
          {fieldErrors?.employmentType && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.employmentType, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '105px', marginLeft: '10px' }}>Work Location</label>
            <WorkLocationAutocomplete
              key="work-location-autocomplete"
              value={formData.workLocation}
              onChange={(value) => {
                handleChange({ target: { name: 'workLocation', value } });
              }}
              options={countryOptions}
              error={!!fieldErrors?.workLocation}
            />
          </div>
          {fieldErrors?.workLocation && (
            <div style={{
              marginTop: '4px',
              marginLeft: '120px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.workLocation, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '100px', marginLeft: '10px' }}>Nationality</label>
            <NationalityAutocomplete
              key="nationality-autocomplete"
              value={formData.nationality}
              onChange={(value) => {
                handleChange({ target: { name: 'nationality', value } });
              }}
              options={countryOptions}
              error={!!fieldErrors?.nationality}
            />
          </div>
          {fieldErrors?.nationality && (
            <div style={{
              marginTop: '4px',
              marginLeft: '115px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.nationality, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Engagement & Role Section
export const EngagementRoleSection = ({
  formData,
  handleChange,
  processStreamOptions,
  applicationOptions,
  onboardingStatusOptions,
  handleDateChange,
  handleInputError,
  clearFieldError,
  clearDateValidationError,
  fieldErrors,
  dateValidationErrors,
  projectId
}) => (
  <div style={{
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    marginBottom: '1rem',
    overflow: 'visible'
  }}>
    <div style={sectionHeaderStyle}>
      Engagement & Role
    </div>
    <div style={{ padding: '12px 16px' }}>
      {/* Row 1 */}
      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '130px', marginRight: '2px' }}>Process Stream <span style={{ color: 'red' }}>*</span></label>
            <ProcessStreamAutocomplete
              key="process-stream-autocomplete"
              value={formData.processStream}
              onChange={(value) => {
                handleChange({ target: { name: 'processStream', value } });
              }}
              options={processStreamOptions}
              error={!!fieldErrors?.processStream}
              width="280px"
            />
          </div>
          {fieldErrors?.processStream && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.processStream, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '80px', marginRight: '2px', marginLeft: '16px' }}>Application</label>
            <ApplicationAutocomplete
              key="application-autocomplete"
              value={formData.application}
              onChange={(value) => {
                handleChange({ target: { name: 'application', value } });
              }}
              options={applicationOptions}
              error={!!fieldErrors?.application}
            />
          </div>
          {fieldErrors?.application && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.application, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '110px', marginRight: '2px', marginLeft: '10px' }}>Resource Level <span style={{ color: 'red' }}>*</span></label>
            <ResourceLevelAutocomplete
              key="resource-level-autocomplete"
              value={formData.resourceLevel}
              onChange={(value) => {
                handleChange({ target: { name: 'resourceLevel', value } });
              }}
              error={!!fieldErrors?.resourceLevel}
            />
          </div>
          {fieldErrors?.resourceLevel && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.resourceLevel, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '122px', marginLeft: '10px' }}>Onboarding Status</label>
            <OnboardingStatusAutocomplete
              key="onboarding-status-autocomplete"
              value={formData.onboardingStatus}
              onChange={(value) => {
                handleChange({ target: { name: 'onboardingStatus', value } });
              }}
              options={onboardingStatusOptions}
              error={!!fieldErrors?.onboardingStatus}
            />
          </div>
          {fieldErrors?.onboardingStatus && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.onboardingStatus, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '130px', marginRight: '2px' }}>Primary Role <span style={{ color: 'red' }}>*</span></label>
            <PrimaryRoleAutocomplete
              key="primary-role-autocomplete"
              value={formData.primaryRole}
              onChange={(value) => {
                handleChange({ target: { name: 'primaryRole', value } });
              }}
              error={!!fieldErrors?.primaryRole}
              projectId={projectId}
            />
          </div>
          {fieldErrors?.primaryRole && (
            <div style={{
              marginTop: '4px',
              marginLeft: '95px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.primaryRole, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '75px', marginLeft: '10px' }}>Start Date <span style={{ color: 'red' }}>*</span></label>
            <CustomDatePicker
              value={formData.startDate}
              onChange={(date) => handleDateChange(date, 'startDate')}
              onError={(error) => handleInputError('startDate', error)}
              clearDateValidationError={() => clearDateValidationError('startDate')}
              onFocus={() => {
                // Clear field error when user focuses on the input
                if (fieldErrors.startDate) {
                  clearFieldError('startDate');
                }
                // Clear date validation error for immediate feedback
                if (dateValidationErrors?.startDate) {
                  // Note: We can't directly modify dateValidationErrors here,
                  // but the validation will be re-run when the user changes the date
                }
              }}
              placeholder="DD-MMM-YYYY"
              error={!!fieldErrors?.startDate || !!dateValidationErrors?.startDate}
            />
          </div>
          {dateValidationErrors?.startDate && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(dateValidationErrors.startDate, { ALLOWED_TAGS: [] })}
            </div>
          )}
          {!dateValidationErrors?.startDate && fieldErrors?.startDate && (
            <div style={{
              marginTop: '4px',
              marginLeft: '135px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.startDate, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '75px', marginLeft: '10px' }}>End Date <span style={{ color: 'red' }}>*</span></label>
            <CustomDatePicker
              value={formData.endDate}
              onChange={(date) => handleDateChange(date, 'endDate')}
              onError={(error) => handleInputError('endDate', error)}
              clearDateValidationError={() => clearDateValidationError('endDate')}
              onFocus={() => {
                // Clear field error when user focuses on the input
                if (fieldErrors.endDate) {
                  clearFieldError('endDate');
                }
                // Clear date validation error for immediate feedback
                if (dateValidationErrors?.endDate) {
                  // Note: We can't directly modify dateValidationErrors here,
                  // but the validation will be re-run when the user changes the date
                }
              }}
              placeholder="DD-MMM-YYYY"
              error={!!fieldErrors?.endDate || !!dateValidationErrors?.endDate}
            />
          </div>
          {dateValidationErrors?.endDate && (
            <div style={{
              marginTop: '4px',
              marginLeft: '127px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(dateValidationErrors.endDate, { ALLOWED_TAGS: [] })}
            </div>
          )}
          {!dateValidationErrors?.endDate && fieldErrors?.endDate && (
            <div style={{
              marginTop: '4px',
              marginLeft: '127px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.endDate, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center' }}>
          <label style={{ ...labelStyle, width: '70px', marginLeft: '18px' }}>Comment</label>
          <TextField
            name="resourceComment"
            value={formData.resourceComment || ''}
            onChange={(e) => {
              const value = e.target.value;
              // Limit to 240 characters and capitalize first character only
              const limitedValue = value.substring(0, 240);
              const capitalizedValue = limitedValue.charAt(0).toUpperCase() + limitedValue.slice(1);
              handleChange({ target: { name: 'resourceComment', value: capitalizedValue } });
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pastedText = e.clipboardData.getData('text');
              const currentValue = formData.resourceComment || '';
              const maxLength = 240;
              const remainingChars = maxLength - currentValue.length;
              const textToAdd = pastedText.substring(0, remainingChars);
              const newValue = currentValue + textToAdd;
              const limitedValue = newValue.substring(0, 240);
              const capitalizedValue = limitedValue.charAt(0).toUpperCase() + limitedValue.slice(1);

              handleChange({ target: { name: 'resourceComment', value: capitalizedValue } });
            }}
            onBlur={(e) => {
              const value = e.target.value;
              // Ensure first character is capitalized on blur
              const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
              handleChange({ target: { name: 'resourceComment', value: capitalizedValue } });
            }}
            placeholder="Optional notes"
            size="small"
            sx={{
              width: '200px',
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
                  borderRadius: '3px',
                },
                '&:hover fieldset': {
                  borderColor: '#ddd',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#ddd',
                  borderWidth: '1px',
                },
              },
              '& .MuiInputLabel-root': {
                display: 'none',
              },
            }}
          />
          <div style={{ fontSize: '12px', color: (formData.resourceComment || '').length >= 240 ? '#ef4444' : '#6b7280', whiteSpace: 'nowrap', marginLeft: '8px' }}>
            {(formData.resourceComment || '').length}/240 {(formData.resourceComment || '').length >= 240 && 'Limit'}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Staffing and Allocation Section
export const StaffingAllocationSection = ({ formData, handleChange, workArrangementOptions, fieldErrors }) => {
  const [showHoursTooltip, setShowHoursTooltip] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showHoursTooltip) {
        setShowHoursTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHoursTooltip]);

  const handleHoursChange = (e) => {
    const value = e.target.value;

    // Allow empty string, numbers, and decimal point
    if (value === '') {
      handleChange(e);
      return;
    }

    // Only allow valid decimal numbers (positive numbers with at most one decimal place)
    const decimalRegex = /^\d*\.?\d?$/;
    if (!decimalRegex.test(value)) {
      return; // Don't update if invalid characters
    }

    // Prevent just a decimal point
    if (value === '.') {
      return;
    }

    // Check if value exceeds 45 hours
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 45) {
      setShowHoursTooltip(true);
      return; // Don't update the form data - block invalid input
    }

    // Hide tooltip if value is valid
    if (showHoursTooltip && (isNaN(numValue) || numValue <= 45)) {
      setShowHoursTooltip(false);
    }

    // Pass the change to parent handler
    handleChange(e);
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      overflow: 'visible'
    }}>
      <div style={sectionHeaderStyle}>
        Staffing and Utilization
      </div>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'nowrap', gap: '4px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
              <label style={{ ...labelStyle, width: '130px' }}>Hours / Week</label>
              <div style={{ position: 'relative' }}>
                <TextField
                  type="text"
                  name="hoursPerWeek"
                  value={formData.hoursPerWeek}
                  onChange={handleHoursChange}
                  onKeyDown={(e) => {
                    // Allow control keys (backspace, delete, tab, escape, enter, arrows, etc.)
                    const controlKeys = [
                      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                      'ArrowLeft', 'ArrowRight',
                      'Home', 'End'
                    ];

                    if (controlKeys.includes(e.key)) {
                      return; // Allow control keys
                    }

                    // Allow digits 0-9 and decimal point
                    if (!/[0-9.]/.test(e.key)) {
                      e.preventDefault(); // Block any other characters
                    }

                    // Prevent multiple decimal points
                    const currentValue = e.target.value;
                    if (e.key === '.' && currentValue.includes('.')) {
                      e.preventDefault();
                    }

                    // Limit to one decimal place
                    const parts = currentValue.split('.');
                    if (parts.length === 2 && parts[1].length >= 1 && /[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="e.g., 4.5, 40"
                  inputProps={{
                    min: 0,
                    max: 45
                  }}
                  size="small"
                  error={!!fieldErrors?.hoursPerWeek}
                  sx={{
                    mr: '10px',
                    width: '180px',
                    '& .MuiInputBase-root': {
                      backgroundColor: 'white',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                    },
                    '& .MuiInputBase-input': {
                      padding: '6px 30px 6px 10px',
                      fontSize: '13px'
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#ddd',
                        borderRadius: '3px',
                      },
                      '&:hover fieldset': {
                        borderColor: '#ddd',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#ddd',
                        borderWidth: '1px',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      display: 'none',
                    },
                  }}
                />
                <Info
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#666',
                    cursor: 'pointer',
                    zIndex: 2
                  }}
                  onClick={() => setShowHoursTooltip(!showHoursTooltip)}
                />
                {showHoursTooltip && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: '0',
                      backgroundColor: '#333',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      zIndex: 1000,
                      marginTop: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  >
                    Maximum Hours per week are 45
                    <br />
                    Utilization % will be calculated automatically
                  </div>
                )}
              </div>
            </div>
            {fieldErrors?.hoursPerWeek && (
              <div style={{
                marginTop: '4px',
                marginLeft: '135px',
                color: '#dc2626',
                fontSize: '10.5px',
                fontWeight: '500'
              }}>
                {DOMPurify.sanitize(fieldErrors.hoursPerWeek, { ALLOWED_TAGS: [] })}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            <label style={{ ...labelStyle, width: '110px' }}>Utilization %</label>
            <TextField
              type="number"
              name="allocationPercent"
              value={formData.allocationPercent}
              onChange={handleChange}
              disabled
              size="small"
              sx={{
                width: '180px',
                '& .MuiInputBase-root': {
                  backgroundColor: '#f5f5f5',
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
                    borderRadius: '3px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#ddd',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#ddd',
                    borderWidth: '1px',
                  },
                },
                '& .MuiInputLabel-root': {
                  display: 'none',
                },
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '130px' }}>Work Arrangement</label>
              <WorkArrangementAutocomplete
                key="work-arrangement-autocomplete"
                value={formData.workArrangement}
                onChange={(value) => {
                  handleChange({ target: { name: 'workArrangement', value } });
                }}
                options={workArrangementOptions}
                error={!!fieldErrors?.workArrangement}
              />
            </div>
            {fieldErrors?.workArrangement && (
              <div style={{
                marginTop: '4px',
                marginLeft: '135px',
                color: '#dc2626',
                fontSize: '10.5px',
                fontWeight: '500'
              }}>
                {DOMPurify.sanitize(fieldErrors.workArrangement, { ALLOWED_TAGS: [] })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Billing & Commercials Section
export const BillingCommercialsSection = ({ formData, handleChange, handleDateChange, handleInputError, clearFieldError, clearDateValidationError, fieldErrors, dateValidationErrors, billingStatusOptions, setFieldErrors }) => (
  <div style={{
    backgroundColor: 'white',
    border: '1px solid #dee2e6',
    overflow: 'visible'
  }}>
    <div style={sectionHeaderStyle}>
      Billing & Commercials
    </div>
    <div style={{ padding: '12px 16px' }}>
      <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'nowrap', gap: '4px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '90px' }}>Billing Status</label>
            <BillabilityStatusAutocomplete
              key="billing-status-autocomplete"
              value={formData.billingStatus}
              onChange={(value) => {
                handleChange({ target: { name: 'billingStatus', value } });
              }}
              options={billingStatusOptions}
              error={!!fieldErrors?.billingStatus}
            />
          </div>
          {fieldErrors?.billingStatus && (
            <div style={{
              marginTop: '4px',
              marginLeft: '95px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.billingStatus, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '110px', marginLeft: '10px' }}>Billing Start Date</label>
            <CustomDatePicker
              value={formData.billingStartDate}
              onChange={(date) => handleDateChange(date, 'billingStartDate')}
              onError={(error) => handleInputError('billingStartDate', error)}
              clearDateValidationError={() => clearDateValidationError('billingStartDate')}
              onFocus={() => {
                // Clear field error when user focuses on the input
                if (fieldErrors.billingStartDate) {
                  clearFieldError('billingStartDate');
                }
                // Clear date validation error for immediate feedback
                if (dateValidationErrors?.billingStartDate) {
                  // Note: We can't directly modify dateValidationErrors here,
                  // but the validation will be re-run when the user changes the date
                }
              }}
              placeholder="DD-MMM-YYYY"
              error={!!fieldErrors?.billingStartDate || !!dateValidationErrors?.billingStartDate}
            />
          </div>
          {dateValidationErrors?.billingStartDate && (
            <div style={{
              marginTop: '4px',
              marginLeft: '125px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(dateValidationErrors.billingStartDate, { ALLOWED_TAGS: [] })}
            </div>
          )}
          {!dateValidationErrors?.billingStartDate && fieldErrors?.billingStartDate && (
            <div style={{
              marginTop: '4px',
              marginLeft: '125px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {DOMPurify.sanitize(fieldErrors.billingStartDate, { ALLOWED_TAGS: [] })}
            </div>
          )}
        </div>
      </div>
      {/* <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '4px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '90px' }}>Rate Card <span style={{ color: 'red' }}>*</span></label>
            <TextField
              type="text"
              name="rateCard"
              value={formData.rateCard}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow numbers (digits only, no decimals)
                if (value === '' || /^\d+$/.test(value)) {
                  handleChange(e);
                }
              }}
              onKeyDown={(e) => {
                // Allow control keys (backspace, delete, tab, escape, enter, arrows, etc.)
                const controlKeys = [
                  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                  'ArrowLeft', 'ArrowRight', 'Home', 'End'
                ];

                if (controlKeys.includes(e.key)) {
                  return; // Allow control keys
                }

                // Only allow digits 0-9
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault(); // Block any other characters
                }
              }}
              size="small"
              error={!!fieldErrors?.rateCard}
              sx={{
                mr: '10px',
                width: '180px',
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
                    borderRadius: '3px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#ddd',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#ddd',
                    borderWidth: '1px',
                  },
                },
                '& .MuiInputLabel-root': {
                  display: 'none',
                },
              }}
            />
          </div>
          {fieldErrors?.rateCard && (
            <div style={{
              marginTop: '4px',
              marginLeft: '95px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {fieldErrors.rateCard}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <label style={{ ...labelStyle, width: '110px' }}>Rate Amount <span style={{ color: 'red' }}>*</span></label>
            <TextField
              type="text"
              name="rateAmount"
              value={formData.rateAmount}
              onChange={(e) => {
                const value = e.target.value;

                // Remove decimal point for digit counting
                const digitsOnly = value.replace('.', '');

                // Check if value exceeds 7 digits (not counting decimal point)
                if (digitsOnly.length > 7) {
                  setFieldErrors(prev => ({
                    ...prev,
                    rateAmount: 'Rate Amount cannot exceed 7 digits'
                  }));
                  return; // Block input if it exceeds 7 digits
                } else {
                  // Clear the error if digit count is within limit
                  if (fieldErrors?.rateAmount === 'Rate Amount cannot exceed 7 digits') {
                    setFieldErrors(prev => ({
                      ...prev,
                      rateAmount: ''
                    }));
                  }
                }

                // Allow empty string, numbers with optional decimal point (e.g., 123, 123., 123.45)
                // Max 7 digits not counting the decimal point
                if (value === '' || /^\d{0,7}\.?\d{0,7}$/.test(value)) {
                  // Additional check: total digits (without decimal) should not exceed 7
                  if (digitsOnly.length <= 7) {
                    handleChange(e);
                  }
                }
              }}
              onKeyDown={(e) => {
                // Allow control keys (backspace, delete, tab, escape, enter, arrows, etc.)
                const controlKeys = [
                  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
                  'ArrowLeft', 'ArrowRight', 'Home', 'End'
                ];

                if (controlKeys.includes(e.key)) {
                  return; // Allow control keys
                }

                const currentValue = e.target.value;
                const digitsOnly = currentValue.replace('.', '');

                // Prevent multiple decimal points
                if (e.key === '.' && currentValue.includes('.')) {
                  e.preventDefault();
                  return;
                }

                // Allow decimal point
                if (e.key === '.') {
                  return;
                }

                // Block input if already at 7 digits and show error
                if (digitsOnly.length >= 7 && /[0-9]/.test(e.key)) {
                  setFieldErrors(prev => ({
                    ...prev,
                    rateAmount: 'Rate Amount cannot exceed 7 digits'
                  }));
                  e.preventDefault();
                  return;
                }

                // Only allow digits 0-9
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault(); // Block any other characters
                }
              }}
              size="small"
              error={!!fieldErrors?.rateAmount}
              sx={{
                width: '180px',
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
                    borderRadius: '3px',
                  },
                  '&:hover fieldset': {
                    borderColor: '#ddd',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#ddd',
                    borderWidth: '1px',
                  },
                },
                '& .MuiInputLabel-root': {
                  display: 'none',
                },
                // Hide the number input spinner arrows
                '& input[type=number]': {
                  MozAppearance: 'textfield',
                },
                '& input[type=number]::-webkit-outer-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
                '& input[type=number]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  margin: 0,
                },
              }}
            />
          </div>
          {fieldErrors?.rateAmount && (
            <div style={{
              marginTop: '4px',
              marginLeft: '115px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {fieldErrors.rateAmount}
            </div>
          )}
        </div>
      </div> */}
    </div>
  </div>
);

// Success Message Component
export const SuccessMessage = ({ message, error = false }) => (
  <div style={{
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: error ? '#ef4444' : '#10b981',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    animation: 'slideIn 0.3s ease-out',
    maxWidth: error ? '400px' : undefined,
    wordWrap: error ? 'break-word' : undefined
  }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {error ? (
        <>
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </>
      ) : (
        <>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22,4 12,14.01 9,11.01" />
        </>
      )}
    </svg>
    {DOMPurify.sanitize(message, { ALLOWED_TAGS: [] })}
  </div>
);

// Error Message Component
export const ErrorMessage = ({ message }) => (
  <div style={{
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    animation: 'slideIn 0.3s ease-out',
    maxWidth: '400px',
    wordWrap: 'break-word'
  }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
    {DOMPurify.sanitize(message, { ALLOWED_TAGS: [] })}
  </div>
);
