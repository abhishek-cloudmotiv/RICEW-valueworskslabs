import ExcelJS from 'exceljs';
import { getIdToken } from './cognito-auth';

/**
 * LOV Data for RICEW Request Template
 * This data structure mirrors the VBA code's LOV_Data sheet
 */
const LOV_DATA = {
    // Column A: RICEW Type (8 options)
    ricewType: [
        'Alert',
        'Analytics Reports',
        'Conversions',
        'Extensions',
        'Integrations',
        'Personalization',
        'Reports',
        'Workflow'
    ],

    // Column B: RICEW Status (17 options)
    ricewStatus: [
        'Approval Pending',
        'Approved',
        'Cancelled',
        'Client Testing Complete',
        'Client Testing In Progress',
        'Complete',
        'FS Complete',
        'FS Work In Progress',
        'FUT Complete',
        'FUT Work In Progress',
        'Hold',
        'Rejected',
        'RICEW Requested',
        'TS Complete',
        'TS Work In Progress',
        'UT Complete',
        'UT Work In Progress'
    ],

    // Column C: Process Stream (5 options)
    processStream: [
        'Enterprise Resource Planning (ERP)',
        'Supply Chain & Manufacturing (SCM)',
        'Human Capital Management (HCM)',
        'Customer Experience (CX)',
        'Fusion Analytics (FAN)'
    ],

    // Column D: Application (13 options)
    application: [
        'Marketing',
        'Workforce Management',
        'Oracle Analytics',
        'Procurement',
        'Customer Experience',
        'Enterprise Performance Management',
        'Talent Management',
        'Project Management',
        'Sales',
        'SCM Analytics',
        'Financial Management',
        'Service',
        'Human Capital Management',
        'HCM Analytics',
        'Supply Chain Management',
        'Product Lifecycle Management',
        'Supply Chain Planning',
        'Payroll',
        'Manufacturing',
        'Risk Management and Compliance',
        'Order Management',
        'Inventory Management',
        'Maintenance',
        'Human Resources',
        'CX Analytics',
        'ERP Analytics'
    ],

    // Column E: L0 Process (18 options)
    l0Process: [
        'Contract Management',
        'Supplier Management',
        'Requisition-to-Order',
        'Procure-to-Pay',
        'Project Budgeting and Forecasting',
        'Project Initiation-to-Close',
        'Record-to-Report',
        'Order-to-Cash',
        'Audit Management',
        'Inventory Management',
        'Source-to-Settle',
        'Order-to-Fulfill',
        'Plan-to-Produce',
        'Concept-to-Design',
        'Lead-to-Opportunity',
        'Quote-to-Order',
        'Lead to Loyalty',
        'Analyze to Act'
    ],

    // Column F: Module (49 options)
    module: [
        'Supplier Management',
        'Procurement Contracts',
        'Purchasing',
        'Self-Service Procurement and Supplier Portal',
        'Sourcing',
        'Financial Consolidation and Close Cloud Service (FCCS)',
        'Tax Reporting Cloud Service (TRCS)',
        'Account Reconciliation Cloud Service (ARCS)',
        'Narrative Reporting',
        'Enterprise Data Management Cloud (EDMCS)',
        'Profitability and Cost Management Cloud Service (PCMCS)',
        'Enterprise Planning and Budgeting Cloud Service (EPBCS)',
        'Planning and Budgeting Cloud Service (PBCS)',
        'Project Costing',
        'Project Portfolio Management (PPM)',
        'Project Financial Management',
        'Project Contract Management',
        'Grants Management',
        'Project Billing',
        'Project Control',
        'Resource Management',
        'Project Procurement',
        'Fixed Assets (FA)',
        'Accounts Payable (AP)',
        'General Ledger (GL)',
        'Accounts Receivable (AR)',
        'Advanced Collections',
        'Advanced Financial Controls (AFC)',
        'Financial Reporting Compliance (FRC)',
        'Risk Management Cloud (ORMC)',
        'Advanced Access Controls (AAC)',
        'Configurator Modeling',
        'Innovation Management',
        'Product Master Data Management (MDM)',
        'Product Development',
        'Workforce Labor Optimization',
        'Time and Labor',
        'Workforce Health and Safety',
        'Workforce Scheduling',
        'Absence Management',
        'Career Development',
        'Compensation',
        'Recruiting',
        'Performance Management',
        'Unity Customer Data Platform',
        'Eloqua Marketing Automation',
        'Responsys Campaign Management',
        'CrowdTwist Loyalty and Engagement',
        'Financial Analytics'
    ],

    // Column G: Complexity (5 options)
    complexity: [
        'Very Simple',
        'Simple',
        'Medium',
        'Complex',
        'Very Complex'
    ]
};

/**
 * Creates a RICEW Request Template Excel file with data validations
 * @returns {Promise<Blob>} Excel file as a Blob
 */
export const createRICEWTemplate = async () => {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'ERP Enablement System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Fetch dynamic LOV data
    const orgServiceLineData = await fetchOrgServiceLineLOV();

    // Extract unique Organizations and Service Lines
    const uniqueOrgs = [...new Set(orgServiceLineData.map(item => item.organization_name))].sort();
    const uniqueServiceLines = [...new Set(orgServiceLineData.map(item => item.ServiceLine_name))].sort();

    // ===== CREATE LOV_DATA SHEET =====
    const lovSheet = workbook.addWorksheet('LOV_Data', {
        state: 'veryHidden' // Hide the sheet (equivalent to xlSheetVeryHidden)
    });

    // Populate LOV data in columns
    LOV_DATA.ricewType.forEach((value, index) => {
        lovSheet.getCell(`A${index + 1}`).value = value;
    });

    LOV_DATA.ricewStatus.forEach((value, index) => {
        lovSheet.getCell(`B${index + 1}`).value = value;
    });

    LOV_DATA.processStream.forEach((value, index) => {
        lovSheet.getCell(`C${index + 1}`).value = value;
    });

    LOV_DATA.application.forEach((value, index) => {
        lovSheet.getCell(`D${index + 1}`).value = value;
    });

    LOV_DATA.l0Process.forEach((value, index) => {
        lovSheet.getCell(`E${index + 1}`).value = value;
    });

    LOV_DATA.module.forEach((value, index) => {
        lovSheet.getCell(`F${index + 1}`).value = value;
    });

    LOV_DATA.complexity.forEach((value, index) => {
        lovSheet.getCell(`G${index + 1}`).value = value;
    });

    // Populate Dynamic LOVs from API
    uniqueOrgs.forEach((value, index) => {
        lovSheet.getCell(`H${index + 1}`).value = value;
    });

    uniqueServiceLines.forEach((value, index) => {
        lovSheet.getCell(`I${index + 1}`).value = value;
    });

    // ===== CREATE MAIN TEMPLATE SHEET =====
    const mainSheet = workbook.addWorksheet('RICEW Request Template');

    // Define column headers
    const headers = [
        'RICEW Name',
        'RICEW Description',
        'Process Stream',
        'Object Type',
        'Complexity',
        'Organization Name',
        'Service Line'
    ];

    // Set headers in first row
    mainSheet.getRow(1).values = headers;

    // Set column widths
    mainSheet.getColumn(1).width = 30;  // RICEW Name
    mainSheet.getColumn(2).width = 45;  // RICEW Description
    mainSheet.getColumn(3).width = 35;  // Process Stream
    mainSheet.getColumn(4).width = 22;  // Object Type
    mainSheet.getColumn(5).width = 20;  // Complexity
    mainSheet.getColumn(6).width = 35;  // Organization Name
    mainSheet.getColumn(7).width = 60;  // Service Line

    // Format header row
    const headerRowFormat = mainSheet.getRow(1);
    headerRowFormat.height = 30;
    headerRowFormat.font = {
        bold: true,
        size: 12
    };
    headerRowFormat.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' } // Light gray (RGB 211, 211, 211)
    };
    headerRowFormat.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true
    };

    // Add borders to header
    headerRowFormat.eachCell((cell) => {
        cell.border = {
            top: { style: 'medium' },
            left: { style: 'medium' },
            bottom: { style: 'medium' },
            right: { style: 'medium' }
        };
    });

    // ===== ADD DATA VALIDATIONS =====
    // Apply validations to rows 2-1001 (1000 data rows)
    const dataRowCount = 1000;

    // Column A: RICEW Name - Text length validation (max 100 characters)
    mainSheet.dataValidations.add('A2:A1001', {
        type: 'textLength',
        operator: 'lessThanOrEqual',
        showErrorMessage: true,
        allowBlank: true,
        formulae: [100],
        errorStyle: 'error',
        errorTitle: 'Invalid Input',
        error: 'RICEW Name must not exceed 100 characters'
    });

    // Add light borders to RICEW Name cells
    for (let row = 2; row <= dataRowCount + 1; row++) {
        const cell = mainSheet.getCell(`A${row}`);

        cell.border = {
            top: { style: 'thin', color: { argb: 'FFC8C8C8' } },
            left: { style: 'thin', color: { argb: 'FFC8C8C8' } },
            bottom: { style: 'thin', color: { argb: 'FFC8C8C8' } },
            right: { style: 'thin', color: { argb: 'FFC8C8C8' } }
        };
    }

    // ===== LOV DROPDOWN VALIDATIONS (COMMENTED OUT) =====
    // Uncomment individual sections below to enable dropdown validation for specific columns

    // Column B: RICEW Description - Text length validation (max 240 characters)
    mainSheet.dataValidations.add('B2:B1001', {
        type: 'textLength',
        operator: 'lessThanOrEqual',
        showErrorMessage: true,
        allowBlank: true,
        formulae: [240],
        errorStyle: 'error',
        errorTitle: 'Invalid Input',
        error: 'RICEW Description must not exceed 240 characters'
    });

    // Add light borders to RICEW Description cells
    for (let row = 2; row <= dataRowCount + 1; row++) {
        const cell = mainSheet.getCell(`B${row}`);

        cell.border = {
            top: { style: 'thin', color: { argb: 'FFC8C8C8' } },
            left: { style: 'thin', color: { argb: 'FFC8C8C8' } },
            bottom: { style: 'thin', color: { argb: 'FFC8C8C8' } },
            right: { style: 'thin', color: { argb: 'FFC8C8C8' } }
        };
    }

    // Column C: Process Stream - Dropdown validation (LOV: 5 options from LOV_Data column C)
    mainSheet.dataValidations.add('C2:C1001', {
        type: 'list',
        allowBlank: true,
        formulae: ['LOV_Data!$C$1:$C$5'],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Input',
        error: 'Please select a valid Process Stream from the dropdown list'
    });

    // Column D: Object Type - Dropdown validation (LOV: 8 options from LOV_Data column A)
    mainSheet.dataValidations.add('D2:D1001', {
        type: 'list',
        allowBlank: true,
        formulae: ['LOV_Data!$A$1:$A$8'],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Input',
        error: 'Please select a valid Object Type from the dropdown list'
    });

    // Column E: Complexity - Dropdown validation (LOV: 5 options from LOV_Data column G)
    mainSheet.dataValidations.add('E2:E1001', {
        type: 'list',
        allowBlank: true,
        formulae: ['LOV_Data!$G$1:$G$5'],
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid Input',
        error: 'Please select a valid Complexity level from the dropdown list'
    });



    // Column F: Organization Name - Dropdown validation (Dynamic LOV from LOV_Data column H)
    if (uniqueOrgs.length > 0) {
        mainSheet.dataValidations.add('F2:F1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$H$1:$H$${uniqueOrgs.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Organization from the dropdown list'
        });
    }

    // Column G: Service Line - Dropdown validation (Dynamic LOV from LOV_Data column I)
    if (uniqueServiceLines.length > 0) {
        mainSheet.dataValidations.add('G2:G1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$I$1:$I$${uniqueServiceLines.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Service Line from the dropdown list'
        });
    }

    // Add borders to all data cells
    const allColumns = ['B', 'C', 'D', 'E', 'F', 'G'];

    for (let row = 2; row <= dataRowCount + 1; row++) {
        allColumns.forEach(col => {
            const cell = mainSheet.getCell(`${col}${row}`);
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFC8C8C8' } },
                left: { style: 'thin', color: { argb: 'FFC8C8C8' } },
                bottom: { style: 'thin', color: { argb: 'FFC8C8C8' } },
                right: { style: 'thin', color: { argb: 'FFC8C8C8' } }
            };
        });
    }

    // Freeze the header row
    mainSheet.views = [
        { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];

    // ===== PROTECT HEADER ROW =====
    // Lock the header row (row 1) to prevent editing
    const headerRow = mainSheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.protection = {
            locked: true
        };
    });

    // Unlock all data rows (rows 2-1001) to allow editing
    for (let row = 2; row <= dataRowCount + 1; row++) {
        for (let col = 1; col <= 7; col++) {
            const cell = mainSheet.getCell(row, col);
            cell.protection = {
                locked: false
            };
        }
    }

    // Enable sheet protection (this protects locked cells only)
    await mainSheet.protect('CloudMotiv123!', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        insertHyperlinks: false,
        deleteColumns: false,
        deleteRows: false,
        sort: true,
        autoFilter: true
    });

    // Generate Excel file as buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Convert buffer to Blob
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    return blob;
};

/**
 * Downloads the RICEW Request Template
 */
export const downloadRICEWTemplate = async () => {
    try {
        const blob = await createRICEWTemplate();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Generate filename with current date
        const currentDate = new Date().toISOString().split('T')[0];
        link.download = `RICEW_Request_Template_${currentDate}.xlsx`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true, message: 'Template downloaded successfully!' };
    } catch (error) {
        console.error('Error downloading template:', error);
        return { success: false, message: 'Failed to download template. Please try again.' };
    }
};

/**
 * Fetches hierarchical master process stream data from the API
 * @returns {Promise<Array>} Master process stream data
 */
const fetchMasterProcessStreamData = async () => {
    try {
        // Get ID token for authorization
        let idToken = null;
        try {
            idToken = await getIdToken();
        } catch (tokenError) {
            console.error('Failed to get ID token for master process streams:', tokenError);
            // Continue without token - API might still work or will return 401
        }

        const headers = {
            'Content-Type': 'application/json',
        };

        if (idToken) {
            headers['Authorization'] = `Bearer ${idToken}`;
        }

        const response = await fetch('https://fuahu3jqsc.execute-api.ap-south-1.amazonaws.com/New/api/get/LOV/allMasterProcessStreams', {
            headers: headers
        });

        if (response.ok) {
            const data = await response.json();
            return data;
        }
        return [];
    } catch (error) {
        console.error('Error fetching master process streams:', error);
        return [];
    }
};

/**
 * Fetches organization and service line LOV data
 * @returns {Promise<Array>} Organization and Service Line data
 */
const fetchOrgServiceLineLOV = async () => {
    try {
        let idToken = null;
        try {
            idToken = await getIdToken();
        } catch (tokenError) {
            console.error('Failed to get ID token for Org/Service LOV:', tokenError);
        }

        const headers = { 'Content-Type': 'application/json' };
        if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

        const projectId = localStorage.getItem('project_id') || '101';

        const response = await fetch(`https://tfv4q9mq6g.execute-api.ap-south-1.amazonaws.com/New/ricew/resourceRateCard/LOV/si-organization-details?project_id=${projectId}`, {
            headers
        });
        const result = await response.json();

        if (response.ok && result.success && Array.isArray(result.data)) {
            const mappedData = [];
            result.data.forEach(item => {
                // Check if ServiceLines exists and has items
                if (item.ServiceLines && Array.isArray(item.ServiceLines) && item.ServiceLines.length > 0) {
                    item.ServiceLines.forEach(sl => {
                        // Combination: Business_Line_Name : Portfolio_Name : Service_Name
                        const combinedServiceName = `${sl.Business_Line_Name} : ${sl.Portfolio_Name} : ${sl.Service_Name}`;
                        mappedData.push({
                            organization_name: item.SI_organization_name,
                            organization_id: item.SI_Organization_Details_id,
                            ServiceLine_name: combinedServiceName
                        });
                    });
                } else {
                    // Fallback for orgs without service lines
                    mappedData.push({
                        organization_name: item.SI_organization_name,
                        organization_id: item.SI_Organization_Details_id,
                        ServiceLine_name: ''
                    });
                }
            });
            return mappedData;
        }
        return [];
    } catch (error) {
        console.error('Error fetching Org/Service Line LOV:', error);
        return [];
    }
};

/**
 * Validates hierarchical relationships between Process Stream, Application, L0 Process, and Module
 * @param {Object} rowData - The row data to validate
 * @param {Array} masterData - The master process stream data
 * @param {number} rowNumber - The row number for error reporting
 * @param {Array} errors - The errors array to push validation errors to
 */
const validateHierarchicalRelationships = (rowData, masterData, rowNumber, errors) => {
    // Validate Application belongs to Process Stream
    if (rowData['Process Stream'] && rowData['Application']) {
        const stream = masterData.find(s => s.stream_name === rowData['Process Stream']);
        if (stream) {
            const application = stream.applications?.find(app => app.app_name === rowData['Application']);
            if (!application) {
                errors.push({
                    row: rowNumber,
                    field: 'Application',
                    message: `Invalid Application: "${rowData['Application']}" does not belong to Process Stream "${rowData['Process Stream']}"`
                });
            } else {
                // Validate L0 Process belongs to Application
                if (rowData['L0 Process']) {
                    const l0Process = application.l0_processes?.find(l0 => l0.l0_name === rowData['L0 Process']);
                    if (!l0Process) {
                        errors.push({
                            row: rowNumber,
                            field: 'L0 Process',
                            message: `Invalid L0 Process: "${rowData['L0 Process']}" does not belong to Application "${rowData['Application']}"`
                        });
                    }
                }

                // Validate Module(s) belong to Application
                if (rowData['Module']) {
                    const modules = rowData['Module'].split(';').map(m => m.trim()).filter(m => m);
                    const validModules = application.modules?.map(mod => mod.module_name) || [];
                    const invalidModules = modules.filter(m => !validModules.includes(m));

                    if (invalidModules.length > 0) {
                        errors.push({
                            row: rowNumber,
                            field: 'Module',
                            message: `Invalid Module(s): "${invalidModules.join('", "')}" do not belong to Application "${rowData['Application']}"`
                        });
                    }
                }
            }
        }
    }

    // Validate Impact Application belongs to Impact Process Stream
    if (rowData['Impact Process Stream'] && rowData['Impact Application']) {
        const impactStream = masterData.find(s => s.stream_name === rowData['Impact Process Stream']);
        if (impactStream) {
            const impactApplication = impactStream.applications?.find(app => app.app_name === rowData['Impact Application']);
            if (!impactApplication) {
                errors.push({
                    row: rowNumber,
                    field: 'Impact Application',
                    message: `Invalid Impact Application: "${rowData['Impact Application']}" does not belong to Impact Process Stream "${rowData['Impact Process Stream']}"`
                });
            } else {
                // Validate Impact L0 Process belongs to Impact Application
                if (rowData['Impact L0 Process']) {
                    const impactL0Process = impactApplication.l0_processes?.find(l0 => l0.l0_name === rowData['Impact L0 Process']);
                    if (!impactL0Process) {
                        errors.push({
                            row: rowNumber,
                            field: 'Impact L0 Process',
                            message: `Invalid Impact L0 Process: "${rowData['Impact L0 Process']}" does not belong to Impact Application "${rowData['Impact Application']}"`
                        });
                    }
                }

                // Validate Impact Module(s) belong to Impact Application
                if (rowData['Impact Module']) {
                    const impactModules = rowData['Impact Module'].split(';').map(m => m.trim()).filter(m => m);
                    const validImpactModules = impactApplication.modules?.map(mod => mod.module_name) || [];
                    const invalidImpactModules = impactModules.filter(m => !validImpactModules.includes(m));

                    if (invalidImpactModules.length > 0) {
                        errors.push({
                            row: rowNumber,
                            field: 'Impact Module',
                            message: `Invalid Impact Module(s): "${invalidImpactModules.join('", "')}" do not belong to Impact Application "${rowData['Impact Application']}"`
                        });
                    }
                }
            }
        }
    }
};

const ricewTypeMapping = {
    'Integration': 'Integrations',
    'Conversion': 'Conversions',
    'Report': 'Reports',
    'Analytics Report': 'Analytics Reports',
    'Alert': 'Alert',
    'Workflow': 'Workflow',
    'Personalization': 'Personalization',
    'Extension': 'Extensions'
};

/**
 * Parses an uploaded RICEW Request Excel file
 * @param {File} file - The uploaded Excel file
 * @returns {Promise<Object>} Parsed data and validation results
 */
export const parseRICEWTemplate = async (file) => {
    try {
        // Fetch hierarchical master data for validation
        const masterProcessStreamData = await fetchMasterProcessStreamData();

        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet('RICEW Request Template');

        if (!worksheet) {
            return {
                success: false,
                message: 'Invalid template: "RICEW Request Template" sheet not found'
            };
        }

        const data = [];
        const errors = [];

        // Start from row 2 (skip header)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header row

            const rawObjectType = row.getCell(4).value?.toString().trim() || '';
            const rowData = {
                rowNumber,
                'RICEW Name': row.getCell(1).value?.toString().trim() || '',
                'RICEW Description': row.getCell(2).value?.toString().trim() || '',
                'Process Stream': row.getCell(3).value?.toString().trim() || '',
                'Application': '',
                'Object Type': ricewTypeMapping[rawObjectType] || rawObjectType,
                'Complexity': row.getCell(5).value?.toString().trim() || '',
                'Organization Name': row.getCell(6).value?.toString().trim() || '',
                'Service Line': row.getCell(7).value?.toString().trim() || ''
            };

            // Skip completely empty rows
            const { rowNumber: _, ...userDataFields } = rowData;
            const hasData = Object.values(userDataFields).some(val => val !== '');
            if (!hasData) return;

            // Validate RICEW Name length
            if (rowData['RICEW Name'] && rowData['RICEW Name'].length > 100) {
                errors.push({
                    row: rowNumber,
                    field: 'RICEW Name',
                    message: 'RICEW Name must not exceed 100 characters'
                });
            }

            // Validate RICEW Description length
            if (rowData['RICEW Description'] && rowData['RICEW Description'].length > 240) {
                errors.push({
                    row: rowNumber,
                    field: 'RICEW Description',
                    message: 'RICEW Description must not exceed 240 characters'
                });
            }

            // Validate Object Type
            if (rowData['Object Type'] && !LOV_DATA.ricewType.includes(rowData['Object Type'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Object Type',
                    message: `Invalid Object Type: "${rowData['Object Type']}"`
                });
            }

            // Validate Process Stream
            if (rowData['Process Stream'] && !LOV_DATA.processStream.includes(rowData['Process Stream'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Process Stream',
                    message: `Invalid Process Stream: "${rowData['Process Stream']}"`
                });
            }

            data.push(rowData);
        });

        return {
            success: true,
            data,
            errors,
            totalRows: data.length,
            validRows: data.length - errors.length
        };
    } catch (error) {
        console.error('Error parsing template:', error);
        return {
            success: false,
            message: `Failed to parse template: ${error.message}`
        };
    }
};

/**
 * Get LOV data for use in frontend forms
 * @returns {Object} LOV data object
 */
export const getLOVData = () => {
    return LOV_DATA;
};
