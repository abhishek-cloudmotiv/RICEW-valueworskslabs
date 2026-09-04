import ExcelJS from 'exceljs';

/**
 * Creates a Roster Mass Upload Template Excel file with data validations
 * @param {Object} lovData - Object containing LOV arrays { processStreams: [], primaryRoles: [], resourceLevels: [], organizations: [] }
 * @returns {Promise<Blob>} Excel file as a Blob
 */
export const createRosterTemplate = async (lovData) => {
    const workbook = new ExcelJS.Workbook();
    const processStreams = lovData?.processStreams || [];
    const primaryRoles = lovData?.primaryRoles || [];
    const resourceLevels = lovData?.resourceLevels || [];
    const organizations = lovData?.organizations || [];

    // Set workbook properties
    workbook.creator = 'ERP Enablement System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ===== CREATE LOV_DATA SHEET =====
    const lovSheet = workbook.addWorksheet('LOV_Data', {
        state: 'veryHidden'
    });

    // Populate LOV data for Process Stream (Column A)
    processStreams.forEach((value, index) => {
        lovSheet.getCell(`A${index + 1}`).value = value;
    });

    // Populate LOV data for Primary Role (Column B)
    primaryRoles.forEach((value, index) => {
        lovSheet.getCell(`B${index + 1}`).value = value;
    });

    // Populate LOV data for Resource Level (Column C)
    resourceLevels.forEach((value, index) => {
        lovSheet.getCell(`C${index + 1}`).value = value;
    });

    // Populate LOV data for Organization Name (Column D)
    organizations.forEach((value, index) => {
        lovSheet.getCell(`D${index + 1}`).value = value;
    });

    // ===== CREATE MAIN TEMPLATE SHEET =====
    const mainSheet = workbook.addWorksheet('Roster Mass Upload Template');

    // Define column headers
    const headers = [
        'Full Name',
        'Primary Role',
        'Resource Level',
        'Process Stream',
        'Organization Name',
        'Email Address',
        'Start Date',
        'End Date'
    ];

    // Set headers in first row
    mainSheet.getRow(1).values = headers;

    // Set column widths
    mainSheet.getColumn(1).width = 30;  // Full Name
    mainSheet.getColumn(2).width = 40;  // Primary Role (Wider for long titles)
    mainSheet.getColumn(3).width = 20;  // Resource Level
    mainSheet.getColumn(4).width = 35;  // Process Stream
    mainSheet.getColumn(5).width = 35;  // Organization Name
    mainSheet.getColumn(6).width = 35;  // Email Address
    mainSheet.getColumn(7).width = 20;  // Start Date
    mainSheet.getColumn(8).width = 20;  // End Date

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
        fgColor: { argb: 'FFD3D3D3' } // Light gray
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

    // ===== ADD DATA VALIDATIONS and STYLES =====
    const dataRowCount = 1000;

    // Column B: Primary Role - Dropdown validation (LOV)
    if (primaryRoles.length > 0) {
        mainSheet.dataValidations.add('B2:B1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$B$1:$B$${primaryRoles.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Primary Role from the dropdown list'
        });
    }

    // Column C: Resource Level - Dropdown validation (LOV)
    if (resourceLevels.length > 0) {
        mainSheet.dataValidations.add('C2:C1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$C$1:$C$${resourceLevels.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Resource Level from the dropdown list'
        });
    }

    // Column D: Process Stream - Dropdown validation (LOV)
    if (processStreams.length > 0) {
        mainSheet.dataValidations.add('D2:D1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$A$1:$A$${processStreams.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Process Stream from the dropdown list'
        });
    }

    // Column E: Organization Name - Dropdown validation (LOV)
    if (organizations.length > 0) {
        mainSheet.dataValidations.add('E2:E1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$D$1:$D$${organizations.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Organization Name from the dropdown list'
        });
    }

    // Add light borders to all data cells
    const allColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

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
    const headerRow = mainSheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.protection = {
            locked: true
        };
    });

    // Unlock all data rows
    for (let row = 2; row <= dataRowCount + 1; row++) {
        for (let col = 1; col <= 8; col++) {
            const cell = mainSheet.getCell(row, col);
            cell.protection = {
                locked: false
            };
        }
    }

    // Enable sheet protection
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

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    return blob;
};

/**
 * Downloads the Roster Mass Upload Template
 * @param {Object} lovData - Object containing LOV arrays { processStreams: [], primaryRoles: [], resourceLevels: [], organizations: [] }
 */
export const downloadRosterTemplate = async (lovData) => {
    try {
        const blob = await createRosterTemplate(lovData);

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const currentDate = new Date().toISOString().split('T')[0];
        link.download = `Roster_Mass_Upload_Template_${currentDate}.xlsx`;

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return { success: true, message: 'Template downloaded successfully!' };
    } catch (error) {
        console.error('Error downloading template:', error);
        return { success: false, message: 'Failed to download template. Please try again.' };
    }
};

/**
 * Parses an uploaded Roster Mass Upload Excel file
 * @param {File} file - The uploaded Excel file
 * @param {Object} lovData - Object containing LOV arrays { processStreams: [], primaryRoles: [], resourceLevels: [], organizations: [] }
 * @returns {Promise<Object>} Parsed data and validation results
 */
export const parseRosterTemplate = async (file, lovData) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet('Roster Mass Upload Template');

        if (!worksheet) {
            return {
                success: false,
                message: 'Invalid template: "Roster Mass Upload Template" sheet not found'
            };
        }

        const data = [];
        const errors = [];
        const processStreams = lovData?.processStreams || [];
        const primaryRoles = lovData?.primaryRoles || [];
        const resourceLevels = lovData?.resourceLevels || [];
        const organizations = lovData?.organizations || [];

        // Start from row 2 (skip header)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const rawStartDate = row.getCell(7).value;
            const rawEndDate = row.getCell(8).value;

            const formatDate = (val) => {
                if (!val) return '';
                const date = new Date(val);
                if (isNaN(date.getTime())) return val.toString().trim();
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };

            const rowData = {
                rowNumber,
                'Full Name': row.getCell(1).value?.toString().trim() || '',
                'Primary Role': row.getCell(2).value?.toString().trim() || '',
                'Resource Level': row.getCell(3).value?.toString().trim() || '',
                'Process Stream': row.getCell(4).value?.toString().trim() || '',
                'Organization Name': row.getCell(5).value?.toString().trim() || '',
                'Email Address': row.getCell(6).value?.toString().trim() || '',
                'Start Date': formatDate(rawStartDate),
                'End Date': formatDate(rawEndDate),
            };

            // Skip empty rows
            const { rowNumber: _, ...userDataFields } = rowData;
            const hasData = Object.values(userDataFields).some(val => val !== '');
            if (!hasData) return;

            // Validate Process Stream
            if (processStreams.length > 0 && rowData['Process Stream'] && !processStreams.includes(rowData['Process Stream'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Process Stream',
                    message: `Invalid Process Stream: "${rowData['Process Stream']}"`
                });
            }

            // Validate Primary Role
            if (primaryRoles.length > 0 && rowData['Primary Role'] && !primaryRoles.includes(rowData['Primary Role'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Primary Role',
                    message: `Invalid Primary Role: "${rowData['Primary Role']}"`
                });
            }

            // Validate Resource Level
            if (resourceLevels.length > 0 && rowData['Resource Level'] && !resourceLevels.includes(rowData['Resource Level'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Resource Level',
                    message: `Invalid Resource Level: "${rowData['Resource Level']}"`
                });
            }

            // Validate Organization Name
            if (organizations.length > 0 && rowData['Organization Name'] && !organizations.includes(rowData['Organization Name'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Organization Name',
                    message: `Invalid Organization Name: "${rowData['Organization Name']}"`
                });
            }

            // Validate Email Address
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (rowData['Email Address'] && !emailRegex.test(rowData['Email Address'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Email Address',
                    message: `Invalid Email Address format: "${rowData['Email Address']}"`
                });
            }

            // Validate Start Date and End Date (End Date >= Start Date)
            const startDateStr = rowData['Start Date'];
            const endDateStr = rowData['End Date'];

            if (startDateStr && endDateStr) {
                const startDate = new Date(startDateStr);
                const endDate = new Date(endDateStr);

                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                    if (endDate < startDate) {
                        errors.push({
                            row: rowNumber,
                            field: 'End Date',
                            message: `End Date cannot be before Start Date`
                        });
                    }
                }
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
