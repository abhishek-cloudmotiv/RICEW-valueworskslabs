import React from 'react';
import { RicewSelect, RicewTypeFieldAutocomplete, ProcessStreamAutocomplete, ImpactProcessStreamAutocomplete, ApplicationAutocomplete, ImpactApplicationAutocomplete, L0ProcessAutocomplete, ImpactL0ProcessAutocomplete, WaveCodeAutocomplete, RolloutCodeAutocomplete, LegalEntityAutocomplete, ComplexityAutocomplete, RicewStatusAutocomplete, CrossStreamImpactAutocomplete, FunctionalOwnerAutocomplete, TechnicalOwnerAutocomplete, ModuleMultiSelect, CostOrganizationAutocomplete } from './RicewAutocompleteComponents';

const labelStyle = {
  fontSize: '13px',
  fontWeight: '400',
  color: '#333',
  marginRight: '2px'
};

const sectionHeaderStyle = {
  backgroundColor: '#f8f9fa',
  padding: '10px 16px',
  color: '#333',
  fontSize: '14px',
  fontWeight: '600',
  borderBottom: '1px solid #dee2e6'
};

const inputStyle = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid #ddd',
  borderRadius: '3px',
  fontSize: '13px',
  boxSizing: 'border-box',
  fontFamily: 'inherit'
};

// General Information Section
export const GeneralInformationSection = ({
  formData,
  fieldErrors,
  onInputChange,
  lovOptions = {}
}) => {
  const [focusedField, setFocusedField] = React.useState(null);
  const renderField = (label, fieldName, type = 'text', options = [], width = '180px', labelWidth = '100px', required = true, useMultiSelect = false, readonly = false) => (
    <div style={{ display: 'flex', whiteSpace: useMultiSelect ? 'normal' : 'nowrap', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: useMultiSelect ? 'flex-start' : 'center' }}>
        <label style={{ ...labelStyle, width: labelWidth, marginTop: useMultiSelect ? '4px' : '0px' }}>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
        {useMultiSelect ? (
          <ModuleMultiSelect
            value={formData[fieldName] || []}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
          />
        ) : type === 'select' && fieldName === 'ricewType' ? (
          <RicewTypeFieldAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'impactProcessStream' ? (
          <ImpactProcessStreamAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'processStream' ? (
          <ProcessStreamAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'impactApplication' ? (
          <ImpactApplicationAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'application' ? (
          <ApplicationAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'impactL0Process' ? (
          <ImpactL0ProcessAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'l0Process' ? (
          <L0ProcessAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' ? (
          <RicewSelect
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            placeholder={`Select ${label}`}
            error={!!fieldErrors[fieldName]}
            width={width}
            readonly={readonly}
          />
        ) : (
          <input
            type={type}
            value={formData[fieldName] || ''}
            onChange={(e) => onInputChange(fieldName, e.target.value)}
            placeholder={`Enter ${label}`}
            readOnly={readonly}
            style={{
              ...inputStyle,
              width: width,
              border: fieldErrors[fieldName]
                ? '1px solid #dc2626'
                : `1px solid ${focusedField === fieldName ? '#007bff' : '#ddd'}`,
              outline: 'none',
              backgroundColor: readonly ? '#f5f5f5' : 'white',
              cursor: readonly ? 'not-allowed' : 'text',
              color: readonly ? 'black' : 'inherit'
            }}
            onFocus={() => setFocusedField(fieldName)}
            onBlur={() => setFocusedField(null)}
          />
        )}
      </div>
      {fieldErrors[fieldName] && (
        <div style={{
          marginTop: '4px',
          marginLeft: `${parseInt(labelWidth) + 5}px`,
          color: '#dc2626',
          fontSize: '10.5px',
          fontWeight: '500'
        }}>
          {fieldErrors[fieldName]}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      marginBottom: '1rem',
      minWidth: '1560px',
      overflow: 'visible'
    }}>
      <div style={sectionHeaderStyle}>
        General Information
      </div>
      <div style={{ padding: '12px 16px' }}>
        {/* Row 0 - Organization and Service Line */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {/* Organization Name */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '120px' }}>
                Organization Name {/*<span style={{ color: 'red' }}>*</span>*/}
              </label>
              <CostOrganizationAutocomplete
                value={formData.organizationId || ''}
                onChange={(value) => onInputChange('organizationId', value)}
                options={lovOptions.organization || []}
                error={!!fieldErrors.organizationId}
                width="220px"
              />
            </div>
            {fieldErrors.organizationId && (
              <div style={{
                marginTop: '4px',
                marginLeft: '125px',
                color: '#dc2626',
                fontSize: '10.5px',
                fontWeight: '500'
              }}>
                {fieldErrors.organizationId}
              </div>
            )}
          </div>

          {/* Service Line Name */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '120px' }}>
                Service Line Name {/*<span style={{ color: 'red' }}>*</span>*/}
              </label>
              <CostOrganizationAutocomplete
                value={formData.serviceLineName || ''}
                onChange={(value) => onInputChange('serviceLineName', value)}
                options={lovOptions.serviceLine || []}
                error={!!fieldErrors.serviceLineName}
                width="500px"
              />
            </div>
            {fieldErrors.serviceLineName && (
              <div style={{
                marginTop: '4px',
                marginLeft: '125px',
                color: '#dc2626',
                fontSize: '10.5px',
                fontWeight: '500'
              }}>
                {fieldErrors.serviceLineName}
              </div>
            )}
          </div>
        </div>

        {/* Row 1 */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {renderField('RICEW Type', 'ricewType', 'select', lovOptions.ricewType || [], '220px', '120px')}
          {renderField('RICEW Name', 'ricewName', 'text', [], '220px', '105px')}
          {renderField('RICEW Description', 'ricewDescription', 'text', [], '220px', '140px')}
          {/* RICEW Object ID - System Generated, Disabled */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '110px', whiteSpace: 'nowrap' }}>
                RICEW Object ID
              </label>
              <input
                type="text"
                value={formData.ricewId || ''}
                disabled
                placeholder="System Generated"
                style={{
                  ...inputStyle,
                  width: '220px',
                  border: '1px solid #ddd',
                  outline: 'none',
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed',
                  color: 'black'
                }}
              />
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {renderField('Process Stream', 'processStream', 'select', lovOptions.processStream || [], '220px', '120px', true)}
          {renderField('Application', 'application', 'select', lovOptions.application || [], '220px', '105px', false)}
          {renderField('L0 Process', 'l0Process', 'select', lovOptions.l0Process || [], '220px', '110px', /*true*/ false)}
          {renderField('Module', 'module', 'select', lovOptions.module || [], '300px', '70px', /*true*/ false, true)}
        </div>
      </div>
    </div>
  );
};

// Process Stream Information Section
export const ProcessStreamInformationSection = ({
  formData,
  fieldErrors,
  onInputChange,
  lovOptions = {}
}) => {
  const [focusedField, setFocusedField] = React.useState(null);
  const renderField = (label, fieldName, type = 'text', options = [], width = '180px', labelWidth = '100px', required = true, useMultiSelect = false, readonly = false) => (
    <div style={{ display: 'flex', whiteSpace: useMultiSelect ? 'normal' : 'nowrap', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: useMultiSelect ? 'flex-start' : 'center' }}>
        <label style={{ ...labelStyle, width: labelWidth, marginTop: useMultiSelect ? '4px' : '0px' }}>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
        {useMultiSelect ? (
          <ModuleMultiSelect
            value={readonly ? [] : (formData[fieldName] || [])}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'impactProcessStream' ? (
          <ImpactProcessStreamAutocomplete
            value={readonly ? '' : (formData[fieldName] || '')}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'processStream' ? (
          <ProcessStreamAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'impactApplication' ? (
          <ImpactApplicationAutocomplete
            value={readonly ? '' : (formData[fieldName] || '')}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'application' ? (
          <ApplicationAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'impactL0Process' ? (
          <ImpactL0ProcessAutocomplete
            value={readonly ? '' : (formData[fieldName] || '')}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' && fieldName === 'l0Process' ? (
          <L0ProcessAutocomplete
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            disabled={readonly}
            readonly={readonly}
          />
        ) : type === 'select' ? (
          <RicewSelect
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            placeholder={`Select ${label}`}
            error={!!fieldErrors[fieldName]}
            width={width}
            readonly={readonly}
          />
        ) : (
          <input
            type={type}
            value={formData[fieldName] || ''}
            onChange={(e) => onInputChange(fieldName, e.target.value)}
            placeholder={`Enter ${label}`}
            readOnly={readonly}
            style={{
              ...inputStyle,
              width: width,
              border: fieldErrors[fieldName]
                ? '1px solid #dc2626'
                : `1px solid ${focusedField === fieldName ? '#007bff' : '#ddd'}`,
              outline: 'none',
              backgroundColor: readonly ? '#f5f5f5' : 'white',
              cursor: readonly ? 'not-allowed' : 'text',
              color: readonly ? 'black' : 'inherit'
            }}
            onFocus={() => setFocusedField(fieldName)}
            onBlur={() => setFocusedField(null)}
          />
        )}
      </div>
      {fieldErrors[fieldName] && (
        <div style={{
          marginTop: '4px',
          marginLeft: `${parseInt(labelWidth) + 5}px`,
          color: '#dc2626',
          fontSize: '10.5px',
          fontWeight: '500'
        }}>
          {fieldErrors[fieldName]}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      marginBottom: '1rem',
      overflow: 'visible'
    }}>
      <div style={sectionHeaderStyle}>
        Process Stream Information
      </div>
      <div style={{ padding: '12px 16px' }}>
        {/* Row 1 - Cross Stream Impact */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '150px' }}>
                Cross Stream Impact
              </label>
              <CrossStreamImpactAutocomplete
                value={formData.crossStreamImpact || ''}
                onChange={(value) => onInputChange('crossStreamImpact', value)}
                options={[
                  { value: 'Yes', label: 'Yes' },
                  { value: 'No', label: 'No' }
                ]}
                error={!!fieldErrors.crossStreamImpact}
                width="220px"
              />
            </div>
          </div>
        </div>

        {/* Row 2 - Process Stream and Application */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {renderField('Process Stream', 'impactProcessStream', 'select', lovOptions.processStream || [], '220px', '110px', false, false, formData.crossStreamImpact === 'No')}
          {renderField('Application', 'impactApplication', 'select', lovOptions.application || [], '220px', '82px', false, false, formData.crossStreamImpact === 'No')}
        </div>

        {/* Row 3 - L0 Process and Module */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {renderField('L0 Process', 'impactL0Process', 'select', lovOptions.l0Process || [], '220px', '110px', false, false, formData.crossStreamImpact === 'No')}
          {renderField('Module', 'impactModule', 'select', lovOptions.module || [], '300px', '82px', false, true, formData.crossStreamImpact === 'No')}
        </div>
      </div>
    </div>
  );
};

// Status & Effort Information Section
export const StatusEffortInformationSection = ({
  formData,
  fieldErrors,
  onInputChange,
  lovOptions = {},
  isEditMode = false,
  onCalculate
}) => {
  const [focusedField, setFocusedField] = React.useState(null);
  const renderField = (label, fieldName, type = 'text', options = [], width = '180px', labelWidth = '100px', required = true, useMultiSelect = false, readonly = false) => (
    <div style={{ display: 'flex', whiteSpace: useMultiSelect ? 'normal' : 'nowrap', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: useMultiSelect ? 'flex-start' : 'center' }}>
        <label style={{ ...labelStyle, width: labelWidth, marginTop: useMultiSelect ? '4px' : '0px' }}>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
        {useMultiSelect ? (
          <ModuleMultiSelect
            value={formData[fieldName] || []}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
            readonly={readonly}
          />
        ) : type === 'select' ? (
          <RicewSelect
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            placeholder={`Select ${label}`}
            error={!!fieldErrors[fieldName]}
            width={width}
            readonly={readonly}
          />
        ) : (
          <input
            type={type}
            value={formData[fieldName] || ''}
            onChange={(e) => onInputChange(fieldName, e.target.value)}
            placeholder={`Enter ${label}`}
            readOnly={readonly}
            style={{
              ...inputStyle,
              width: width,
              border: fieldErrors[fieldName]
                ? '1px solid #dc2626'
                : `1px solid ${focusedField === fieldName ? '#007bff' : '#ddd'}`,
              outline: 'none',
              backgroundColor: readonly ? '#f5f5f5' : 'white',
              cursor: readonly ? 'not-allowed' : 'text',
              color: readonly ? 'black' : 'inherit'
            }}
            onFocus={() => setFocusedField(fieldName)}
            onBlur={() => setFocusedField(null)}
          />
        )}
      </div>
      {fieldErrors[fieldName] && (
        <div style={{
          marginTop: '4px',
          marginLeft: `${parseInt(labelWidth) + 5}px`,
          color: '#dc2626',
          fontSize: '10.5px',
          fontWeight: '500'
        }}>
          {fieldErrors[fieldName]}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      marginBottom: '1rem',
      overflow: 'visible'
    }}>
      <div style={sectionHeaderStyle}>
        Status & Effort Information
      </div>
      <div style={{ padding: '12px 16px' }}>
        {/* Row 1 - RICEW Status and Complexity */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '140px' }}>
                RICEW Status
              </label>
              <RicewStatusAutocomplete
                value={formData.ricewStatusDetail || ''}
                onChange={(value) => onInputChange('ricewStatusDetail', value)}
                options={lovOptions.ricewStatus || []}
                error={!!fieldErrors.ricewStatusDetail}
                width="220px"
                readonly={!isEditMode}
              />
            </div>
          </div>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '98px' }}>
                Complexity <span style={{ color: 'red' }}>*</span>
              </label>
              <ComplexityAutocomplete
                value={formData.complexity || ''}
                onChange={(value) => onInputChange('complexity', value)}
                options={[
                  { value: 'Very Simple', label: 'Very Simple' },
                  { value: 'Simple', label: 'Simple' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Complex', label: 'Complex' },
                  { value: 'Very Complex', label: 'Very Complex' }
                ]}
                error={!!fieldErrors.complexity}
                width="220px"
              />
            </div>
          </div>
        </div>

        {/* Row 2 - RICEW Effort(Hours) and RICEW Cost */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          {renderField('RICEW Effort (Hours)', 'ricewEffortHours', 'number', [], '220px', '140px', true, false, true)}
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ ...labelStyle, width: '90px' }}>
                RICEW Cost <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.ricewCostAmount && formData.ricewCostCurrency ? `${formData.ricewCostAmount} (${formData.ricewCostCurrency})` : ''}
                readOnly={true}
                placeholder="RICEW Cost"
                style={{
                  ...inputStyle,
                  width: '224px',
                  border: (fieldErrors.ricewCostCurrency || fieldErrors.ricewCostAmount)
                    ? '1px solid #dc2626'
                    : `1px solid ${focusedField === 'ricewCostAmount' ? '#007bff' : '#ddd'}`,
                  outline: 'none',
                  backgroundColor: '#f5f5f5',
                  cursor: 'not-allowed',
                  color: 'black'
                }}
                onFocus={() => setFocusedField('ricewCostAmount')}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            {(fieldErrors.ricewCostCurrency || fieldErrors.ricewCostAmount) && (
              <div style={{
                marginLeft: '100px',
                color: '#dc2626',
                fontSize: '10.5px',
                fontWeight: '500'
              }}>
                {fieldErrors.ricewCostCurrency || fieldErrors.ricewCostAmount}
              </div>
            )}
          </div>
        </div>

        {/* Row 3 - Calculate Button */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          <button
            type="button"
            onClick={onCalculate}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '6px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              height: '32px',
              transition: 'background-color 0.2s',
              marginTop: '5px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            Calculate
          </button>
        </div>
      </div>
    </div>
  );
};

// Note Section
export const NoteSection = ({
  formData,
  fieldErrors,
  onInputChange
}) => {
  const [focusedField, setFocusedField] = React.useState(null);

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      marginBottom: '1rem',
      overflow: 'visible',
      height: '94%' //94%
    }}>
      <div style={sectionHeaderStyle}>
        Notes Section
      </div>
      <div style={{ padding: '12px 16px', height: 'calc(100% - 40px)' }}>
        <div style={{ marginBottom: '10px', height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', height: '100%' }}>
            <label style={{ ...labelStyle, width: '80px', marginTop: '4px' }}>
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => {
                let value = e.target.value;
                // Capitalize first character
                if (value.length > 0) {
                  value = value.charAt(0).toUpperCase() + value.slice(1);
                }
                onInputChange('notes', value);
              }}
              placeholder="Enter your notes here..."
              rows={4}
              style={{
                ...inputStyle,
                width: '100%',
                resize: 'none',
                height: '100px', //160 px
                border: fieldErrors.notes
                  ? '1px solid #dc2626'
                  : `1px solid ${focusedField === 'notes' ? '#007bff' : '#ddd'}`,
                outline: 'none'
              }}
              onFocus={() => setFocusedField('notes')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
          {fieldErrors.notes && (
            <div style={{
              marginTop: '4px',
              marginLeft: '85px',
              color: '#dc2626',
              fontSize: '10.5px',
              fontWeight: '500'
            }}>
              {fieldErrors.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// RICEW Resource Responsibility Section
export const RicewResourceResponsibilitySection = ({
  formData,
  fieldErrors,
  onInputChange,
  resourceRosterOptions = []
}) => {
  const [focusedField, setFocusedField] = React.useState(null);
  const roles = [
    { label: 'Functional Spec. Writer', field: 'functionalSpecWriter' },
    { label: 'Technical Spec. Writer', field: 'technicalSpecWriter' },
    { label: 'Code Developer & Unit Testing', field: 'codeDeveloperUnitTesting' },
    { label: 'Functional Unit Tester', field: 'functionalUnitTester' }
  ];

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      marginBottom: '1rem',
      overflow: 'visible'
    }}>
      <div style={sectionHeaderStyle}>
        RICEW Resource Responsibility
      </div>
      <div style={{ padding: '12px 16px' }}>

        {/* Table Rows */}
        {roles.map((role, index) => (
          <div key={index} style={{
            display: 'grid',
            gridTemplateColumns: (role.field === 'functionalSpecWriter' || role.field === 'technicalSpecWriter' || role.field === 'functionalUnitTester') ? '100px 250px 80px 250px' : '100px 250px',
            gap: '20px',
            marginBottom: '12px',
            alignItems: 'center'
          }}>
            {/* Role Label */}
            <div style={{ fontSize: '13px', color: '#333' }}>
              {role.label}
            </div>

            {/* Resource Roster Select (Autocomplete) */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <FunctionalOwnerAutocomplete
                value={formData[role.field] || ''}
                onChange={(value) => onInputChange(role.field, value)}
                options={resourceRosterOptions}
                error={!!fieldErrors[role.field]}
                width="250px"
              />
              {fieldErrors[role.field] && (
                <div style={{
                  marginTop: '4px',
                  color: '#dc2626',
                  fontSize: '10.5px',
                  fontWeight: '500'
                }}>
                  {fieldErrors[role.field]}
                </div>
              )}
            </div>

            {/* New Field for Functional Spec Writer */}
            {role.field === 'functionalSpecWriter' && (
              <>
                <div style={{ fontSize: '13px', color: '#333' }}>
                  Functional Specification Approval
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <input
                    type="text"
                    value={formData.functionalSpecApproval || ''}
                    onChange={(e) => onInputChange('functionalSpecApproval', e.target.value)}
                    placeholder="Approval Details"
                    style={{
                      ...inputStyle,
                      width: '250px',
                      border: fieldErrors.functionalSpecApproval
                        ? '1px solid #dc2626'
                        : `1px solid ${focusedField === 'functionalSpecApproval' ? '#007bff' : '#ddd'}`,
                      outline: 'none'
                    }}
                    onFocus={() => setFocusedField('functionalSpecApproval')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {fieldErrors.functionalSpecApproval && (
                    <div style={{
                      marginTop: '4px',
                      color: '#dc2626',
                      fontSize: '10.5px',
                      fontWeight: '500'
                    }}>
                      {fieldErrors.functionalSpecApproval}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* New Field for Technical Spec Writer */}
            {role.field === 'technicalSpecWriter' && (
              <>
                <div style={{ fontSize: '13px', color: '#333' }}>
                  Technical Specification Approval
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <input
                    type="text"
                    value={formData.technicalSpecApproval || ''}
                    onChange={(e) => onInputChange('technicalSpecApproval', e.target.value)}
                    placeholder="Approval Details"
                    style={{
                      ...inputStyle,
                      width: '250px',
                      border: fieldErrors.technicalSpecApproval
                        ? '1px solid #dc2626'
                        : `1px solid ${focusedField === 'technicalSpecApproval' ? '#007bff' : '#ddd'}`,
                      outline: 'none'
                    }}
                    onFocus={() => setFocusedField('technicalSpecApproval')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {fieldErrors.technicalSpecApproval && (
                    <div style={{
                      marginTop: '4px',
                      color: '#dc2626',
                      fontSize: '10.5px',
                      fontWeight: '500'
                    }}>
                      {fieldErrors.technicalSpecApproval}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* New Field for Functional Unit Tester */}
            {role.field === 'functionalUnitTester' && (
              <>
                <div style={{ fontSize: '13px', color: '#333' }}>
                  Functional Testing Approval
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <input
                    type="text"
                    value={formData.functionalTestingApproval || ''}
                    onChange={(e) => onInputChange('functionalTestingApproval', e.target.value)}
                    placeholder="Approval Details"
                    style={{
                      ...inputStyle,
                      width: '250px',
                      border: fieldErrors.functionalTestingApproval
                        ? '1px solid #dc2626'
                        : `1px solid ${focusedField === 'functionalTestingApproval' ? '#007bff' : '#ddd'}`,
                      outline: 'none'
                    }}
                    onFocus={() => setFocusedField('functionalTestingApproval')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {fieldErrors.functionalTestingApproval && (
                    <div style={{
                      marginTop: '4px',
                      color: '#dc2626',
                      fontSize: '10.5px',
                      fontWeight: '500'
                    }}>
                      {fieldErrors.functionalTestingApproval}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Implementation Phase Information Section
export const ImplementationPhaseSection = ({
  formData,
  fieldErrors,
  onInputChange,
  lovOptions = {}
}) => {
  const [focusedField, setFocusedField] = React.useState(null);
  const renderField = (label, fieldName, type = 'text', options = [], width = '180px', labelWidth = '100px', required = true, readonly = false, useMultiSelect = false) => (
    <div style={{ display: 'flex', whiteSpace: useMultiSelect ? 'normal' : 'nowrap', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: useMultiSelect ? 'flex-start' : 'center' }}>
        <label style={{ ...labelStyle, width: labelWidth, marginTop: useMultiSelect ? '4px' : '0px' }}>
          {label} {required && <span style={{ color: 'red' }}>*</span>}
        </label>
        {useMultiSelect ? (
          <ModuleMultiSelect
            value={formData[fieldName] || []}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            error={!!fieldErrors[fieldName]}
            width={width}
          />
        ) : type === 'select' ? (
          <RicewSelect
            value={formData[fieldName] || ''}
            onChange={(value) => onInputChange(fieldName, value)}
            options={options}
            placeholder={`Select ${label}`}
            error={!!fieldErrors[fieldName]}
            width={width}
          />
        ) : (
          <input
            type={type}
            value={formData[fieldName] || ''}
            onChange={(e) => onInputChange(fieldName, e.target.value)}
            placeholder={`Enter ${label}`}
            readOnly={readonly}
            style={{
              ...inputStyle,
              width: width,
              border: fieldErrors[fieldName]
                ? '1px solid #dc2626'
                : `1px solid ${focusedField === fieldName ? '#007bff' : '#ddd'}`,
              outline: 'none',
              backgroundColor: readonly ? '#f5f5f5' : 'white',
              cursor: readonly ? 'not-allowed' : 'text'
            }}
            onFocus={() => setFocusedField(fieldName)}
            onBlur={() => setFocusedField(null)}
          />
        )}
      </div>
      {fieldErrors[fieldName] && (
        <div style={{
          marginTop: '4px',
          marginLeft: `${parseInt(labelWidth) + 5}px`,
          color: '#dc2626',
          fontSize: '10.5px',
          fontWeight: '500'
        }}>
          {fieldErrors[fieldName]}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      marginBottom: '1rem',
      overflow: 'visible'
    }}>
      <div style={sectionHeaderStyle}>
        Implementation Phase Information
      </div>
      <div style={{ padding: '12px 16px' }}>
        {/* Row 1 - Wave Code and Wave Name */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '90px' }}>
                Wave Code {/*<span style={{ color: 'red' }}>*</span>*/}
              </label>
              <WaveCodeAutocomplete
                value={formData.waveCode || ''}
                onChange={(value) => onInputChange('waveCode', value)}
                options={lovOptions.wave || []}
                error={!!fieldErrors.waveCode}
                width="220px"
              />
            </div>
            {fieldErrors.waveCode && (
              <div style={{
                marginTop: '4px',
                marginLeft: '95px',
                color: '#dc2626',
                fontSize: '10.5px',
                fontWeight: '500'
              }}>
                {fieldErrors.waveCode}
              </div>
            )}
          </div>
          {renderField('Wave Name', 'waveName', 'text', [], '220px', '90px', false, true)}
        </div>

        {/* Row 2 - Rollout Code and Rollout Name */}
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '90px' }}>
                Rollout Code {/*<span style={{ color: 'red' }}>*</span>*/}
              </label>
              <RolloutCodeAutocomplete
                value={formData.rolloutCode || ''}
                onChange={(value) => onInputChange('rolloutCode', value)}
                options={lovOptions.rollout || []}
                error={!!fieldErrors.rolloutCode}
                width="220px"
              />
            </div>
            {fieldErrors.rolloutCode && (
              <div style={{
                marginTop: '4px',
                marginLeft: '95px',
                color: '#dc2626',
                fontSize: '10.5px',
                fontWeight: '500'
              }}>
                {fieldErrors.rolloutCode}
              </div>
            )}
          </div>
          {renderField('Rollout Name', 'rolloutName', 'text', [], '220px', '90px', false, true)}
        </div>

        {/* Row 3 - Legal Entity Code and Legal Entity Name */}
        {/*
        <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '30px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ ...labelStyle, width: '120px' }}>
                Legal Entity Code
              </label>
              <LegalEntityAutocomplete
                value={formData.legalEntityCode || ''}
                onChange={(value) => onInputChange('legalEntityCode', value)}
                options={lovOptions.legalEntity || []}
                error={!!fieldErrors.legalEntityCode}
                width="190px"
              />
            </div>
            {fieldErrors.legalEntityCode && (
              <div style={{
                marginTop: '4px',
                marginLeft: '125px',
                color: '#dc2626',
                fontSize: '10.5px',
                fontWeight: '500'
              }}>
                {fieldErrors.legalEntityCode}
              </div>
            )}
          </div>
          {renderField('Legal Entity Name', 'legalEntityName', 'text', [], '190px', '120px', false, true)}
        </div>
        */}
      </div>
    </div>
  );
};

// Ownership Section
export const OwnershipSection = ({
  formData,
  fieldErrors,
  onInputChange,
  onFieldBlur,
  resourceRosterOptions = []
}) => {
  const [focusedField, setFocusedField] = React.useState(null);
  const renderOwnerField = (label, nameField, emailField, labelWidth = '130px', required = true, useAutocomplete = false, AutocompleteComponent = null, readonlyEmail = false) => (
    <div style={{ marginBottom: '10px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ ...labelStyle, width: labelWidth }}>
            {label} {/*{required && <span style={{ color: 'red' }}>*</span>}*/}
          </label>
          {useAutocomplete && AutocompleteComponent ? (
            <AutocompleteComponent
              value={formData[nameField] || ''}
              onChange={(value) => onInputChange(nameField, value)}
              options={resourceRosterOptions}
              error={!!fieldErrors[nameField]}
              width="250px"
            />
          ) : (
            <input
              type="text"
              value={formData[nameField] || ''}
              onChange={(e) => onInputChange(nameField, e.target.value)}
              placeholder="Name"
              style={{
                ...inputStyle,
                width: '250px',
                border: fieldErrors[nameField]
                  ? '1px solid #dc2626'
                  : `1px solid ${focusedField === nameField ? '#007bff' : '#ddd'}`,
                outline: 'none'
              }}
              onFocus={() => setFocusedField(nameField)}
              onBlur={() => setFocusedField(null)}
            />
          )}
        </div>
        {fieldErrors[nameField] && (
          <div style={{
            marginTop: '4px',
            marginLeft: `${parseInt(labelWidth) + 5}px`,
            color: '#dc2626',
            fontSize: '10.5px',
            fontWeight: '500'
          }}>
            {fieldErrors[nameField]}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', whiteSpace: 'nowrap', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label style={{ ...labelStyle, width: '60px' }}>
            Email {/*{required && <span style={{ color: 'red' }}>*</span>}*/}
          </label>
          <input
            type="email"
            value={formData[emailField] || ''}
            onChange={(e) => onInputChange(emailField, e.target.value)}
            placeholder="Email Address"
            readOnly={readonlyEmail}
            style={{
              ...inputStyle,
              width: '250px',
              border: fieldErrors[emailField]
                ? '1px solid #dc2626'
                : `1px solid ${focusedField === emailField ? '#007bff' : '#ddd'}`,
              outline: 'none',
              backgroundColor: readonlyEmail ? '#f5f5f5' : 'white',
              cursor: readonlyEmail ? 'not-allowed' : 'text'
            }}
            onFocus={() => setFocusedField(emailField)}
            onBlur={() => {
              setFocusedField(null);
              if (onFieldBlur) {
                onFieldBlur(emailField);
              }
            }}
          />
        </div>
        {fieldErrors[emailField] && (
          <div style={{
            marginTop: '4px',
            marginLeft: '66px',
            color: '#dc2626',
            fontSize: '10.5px',
            fontWeight: '500'
          }}>
            {fieldErrors[emailField]}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #dee2e6',
      marginBottom: '1rem',
      overflow: 'visible'
    }}>
      <div style={sectionHeaderStyle}>
        Ownership (Project Track) Information
      </div>
      <div style={{ padding: '12px 16px' }}>
        {renderOwnerField('Business Owner', 'businessOwnerName', 'businessOwnerEmail', '130px', /*true*/ false)}
        {renderOwnerField('Functional Owner', 'functionalOwnerName', 'functionalOwnerEmail', '130px', /*true*/ false, true, FunctionalOwnerAutocomplete, true)}
        {renderOwnerField('Technical Owner', 'technicalOwnerName', 'technicalOwnerEmail', '130px', /*true*/ false, true, TechnicalOwnerAutocomplete, true)}
      </div>
    </div>
  );
};

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
    {message}
  </div>
);

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
    {message}
  </div>
);

