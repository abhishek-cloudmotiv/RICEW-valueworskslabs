import ExcelJS from 'exceljs';

/**
 * Creates a Resource Definition Mass Upload Template Excel file with data validations
 * @param {Object} lovData - Object containing LOV arrays { resourceLevels: [], organizations: [], skills: [] }
 * @returns {Promise<Blob>} Excel file as a Blob
 */
export const createResourceDefinitionTemplate = async (lovData) => {
    const workbook = new ExcelJS.Workbook();
    const resourceLevels = lovData?.resourceLevels || [];
    const organizations = lovData?.organizations || [];
    const skills = lovData?.skills || [];

    // Set workbook properties
    workbook.creator = 'ERP Enablement System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ===== CREATE LOV_DATA SHEET =====
    const lovSheet = workbook.addWorksheet('LOV_Data', {
        state: 'veryHidden'
    });

    // Populate LOV data for Resource Level (Column A)
    resourceLevels.forEach((value, index) => {
        lovSheet.getCell(`A${index + 1}`).value = value;
    });

    // Populate LOV data for Organization Name (Column B)
    organizations.forEach((value, index) => {
        lovSheet.getCell(`B${index + 1}`).value = value;
    });

    // Populate LOV data for Skills (Column C)
    skills.forEach((value, index) => {
        lovSheet.getCell(`C${index + 1}`).value = value;
    });

    // ===== CREATE MAIN TEMPLATE SHEET =====
    const mainSheet = workbook.addWorksheet('Resource Definition Template');

    // Define column headers
    const headers = [
        'Full Name',
        'Employee ID',
        'Email Address',
        'Employee Level',
        'Primary_Skill',
        'Secondary_Skill',
        'Organization Name',
        'Join Date',
        'Exit Date'
    ];

    // Set headers in first row
    mainSheet.getRow(1).values = headers;

    // Set column widths
    mainSheet.getColumn(1).width = 30;  // Full Name
    mainSheet.getColumn(2).width = 20;  // Employee ID
    mainSheet.getColumn(3).width = 35;  // Email Address
    mainSheet.getColumn(4).width = 35;  // Employee Level
    mainSheet.getColumn(5).width = 24;  // Primary_Skill
    mainSheet.getColumn(6).width = 24;  // Secondary_Skill
    mainSheet.getColumn(7).width = 35;  // Organization Name
    mainSheet.getColumn(8).width = 20;  // Join Date
    mainSheet.getColumn(8).numFmt = 'dd-mmm-yyyy';
    mainSheet.getColumn(9).width = 20;  // Exit Date
    mainSheet.getColumn(9).numFmt = 'dd-mmm-yyyy';

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

    // Column D: Employee Level - Dropdown validation (LOV)
    if (resourceLevels.length > 0) {
        mainSheet.dataValidations.add('D2:D1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$A$1:$A$${resourceLevels.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Employee Level from the dropdown list'
        });
    }

    // Column G: Organization Name - Dropdown validation (LOV)
    if (organizations.length > 0) {
        mainSheet.dataValidations.add('G2:G1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$B$1:$B$${organizations.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Organization Name from the dropdown list'
        });
    }

    // Column E: Primary Skill - Dropdown validation (LOV)
    if (skills.length > 0) {
        mainSheet.dataValidations.add('E2:E1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$C$1:$C$${skills.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Skill from the dropdown list'
        });
    }

    // Column F: Secondary Skill - Dropdown validation (LOV)
    if (skills.length > 0) {
        mainSheet.dataValidations.add('F2:F1001', {
            type: 'list',
            allowBlank: true,
            formulae: [`LOV_Data!$C$1:$C$${skills.length}`],
            showErrorMessage: true,
            errorStyle: 'error',
            errorTitle: 'Invalid Input',
            error: 'Please select a valid Skill from the dropdown list'
        });
    }

    // Add light borders to all data cells
    const allColumns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

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
        for (let col = 1; col <= 9; col++) {
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
 * Downloads the Resource Definition Template
 * @param {Object} lovData - Object containing LOV arrays { resourceLevels: [], organizations: [] }
 */
export const downloadResourceDefinitionTemplate = async (lovData) => {
    try {
        const blob = await createResourceDefinitionTemplate(lovData);

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const currentDate = new Date().toISOString().split('T')[0];
        link.download = `Resource_Definition_Template_${currentDate}.xlsx`;

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
 * Parses an uploaded Resource Definition Excel file
 * @param {File} file - The uploaded Excel file
 * @param {Object} lovData - Object containing LOV arrays { resourceLevels: [], organizations: [], skills: [] }
 * @returns {Promise<Object>} Parsed data and validation results
 */
export const parseResourceDefinitionTemplate = async (file, lovData) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet('Resource Definition Template');

        if (!worksheet) {
            return {
                success: false,
                message: 'Invalid template: "Resource Definition Template" sheet not found'
            };
        }

        const data = [];
        const errors = [];
        const resourceLevels = lovData?.resourceLevels || [];
        const organizations = lovData?.organizations || [];
        const skills = lovData?.skills || [];

        // Start from row 2 (skip header)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const rawJoinDate = row.getCell(8).value;
            const rawExitDate = row.getCell(9).value;

            const formatDate = (val) => {
                if (!val) return '';
                
                let date;
                if (val instanceof Date) {
                    date = val;
                } else if (typeof val === 'number') {
                    // Excel serial date to JS Date
                    date = new Date(Math.round((val - 25569) * 86400 * 1000));
                } else if (typeof val === 'string') {
                    // Check if it matches DD/MM/YYYY or DD-MM-YYYY
                    const parts = val.split(/[-/]/);
                    if (parts.length === 3) {
                        const d = parseInt(parts[0], 10);
                        const m = parseInt(parts[1], 10) - 1;
                        let y = parseInt(parts[2], 10);
                        if (y < 100) y += 2000; // handle 2-digit year
                        
                        const tempDate = new Date(y, m, d);
                        if (!isNaN(tempDate.getTime())) {
                            date = tempDate;
                        } else {
                            date = new Date(val);
                        }
                    } else {
                        date = new Date(val);
                    }
                } else {
                    date = new Date(val);
                }

                if (isNaN(date.getTime())) return val.toString().trim();
                
                const d = String(date.getDate()).padStart(2, '0');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const m = monthNames[date.getMonth()];
                const y = date.getFullYear();
                return `${d}-${m}-${y}`;
            };

            const rowData = {
                rowNumber,
                'Full Name': row.getCell(1).value?.toString().trim() || '',
                'Employee ID': row.getCell(2).value?.toString().trim() || '',
                'Email Address': row.getCell(3).value?.toString().trim() || '',
                'Employee Level': row.getCell(4).value?.toString().trim() || '',
                'Primary_Skill': row.getCell(5).value?.toString().trim() || '',
                'Secondary_Skill': row.getCell(6).value?.toString().trim() || '',
                'Organization Name': row.getCell(7).value?.toString().trim() || '',
                'Join Date': formatDate(rawJoinDate),
                'Exit Date': formatDate(rawExitDate),
            };

            // Skip empty rows
            const { rowNumber: _, ...userDataFields } = rowData;
            const hasData = Object.values(userDataFields).some(val => val !== '');
            if (!hasData) return;

            // Validate Employee Level
            if (resourceLevels.length > 0 && rowData['Employee Level'] && !resourceLevels.includes(rowData['Employee Level'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Employee Level',
                    message: `Invalid Employee Level: "${rowData['Employee Level']}"`
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

            // Validate Primary Skill
            if (skills.length > 0 && rowData['Primary_Skill'] && !skills.includes(rowData['Primary_Skill'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Primary_Skill',
                    message: `Invalid Primary Skill: "${rowData['Primary_Skill']}"`
                });
            }

            // Validate Secondary Skill
            if (skills.length > 0 && rowData['Secondary_Skill'] && !skills.includes(rowData['Secondary_Skill'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Secondary_Skill',
                    message: `Invalid Secondary Skill: "${rowData['Secondary_Skill']}"`
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

            // Validate Join Date and Exit Date (Exit Date >= Join Date)
            const joinDateStr = rowData['Join Date'];
            const exitDateStr = rowData['Exit Date'];

            if (joinDateStr && exitDateStr) {
                const joinDate = new Date(joinDateStr);
                const exitDate = new Date(exitDateStr);

                if (!isNaN(joinDate.getTime()) && !isNaN(exitDate.getTime())) {
                    if (exitDate < joinDate) {
                        errors.push({
                            row: rowNumber,
                            field: 'Exit Date',
                            message: `Exit Date cannot be before Join Date`
                        });
                        errors.push({
                            row: rowNumber,
                            field: 'Join Date',
                            message: `Join Date cannot be after Exit Date`
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
