import ExcelJS from 'exceljs';

/**
 * Creates a Client Roster Mass Upload Template Excel file
 * @returns {Promise<Blob>} Excel file as a Blob
 */
export const createClientRosterTemplate = async () => {
    const workbook = new ExcelJS.Workbook();

    // Set workbook properties
    workbook.creator = 'ERP Enablement System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // ===== CREATE MAIN TEMPLATE SHEET =====
    const mainSheet = workbook.addWorksheet('Client Roster Mass Upload');

    // Define column headers
    const headers = [
        'Client Name',
        'Client Email',
        'Phone Code',
        'Phone Number'
    ];

    // Set headers in first row
    mainSheet.getRow(1).values = headers;

    // Set column widths
    mainSheet.getColumn(1).width = 30;  // Client Name
    mainSheet.getColumn(2).width = 35;  // Client Email
    mainSheet.getColumn(3).width = 15;  // Phone Code
    mainSheet.getColumn(4).width = 25;  // Phone Number

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

    const dataRowCount = 1000;

    // Add light borders to all data cells
    const allColumns = ['A', 'B', 'C', 'D'];

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
        for (let col = 1; col <= 4; col++) {
            const cell = mainSheet.getCell(row, col);
            cell.protection = {
                locked: false
            };
        }
    }

    // Add data validation for Phone Code (Column C) - max 3 digits
    for (let row = 2; row <= dataRowCount + 1; row++) {
        mainSheet.getCell(`C${row}`).dataValidation = {
            type: 'textLength',
            operator: 'lessThanOrEqual',
            showErrorMessage: true,
            errorTitle: 'Invalid Phone Code',
            error: 'Phone Code must be max 3 digits',
            formulae: [3]
        };
    }

    // Add data validation for Phone Number (Column D) - 8 to 10 digits
    for (let row = 2; row <= dataRowCount + 1; row++) {
        mainSheet.getCell(`D${row}`).dataValidation = {
            type: 'textLength',
            operator: 'between',
            showErrorMessage: true,
            errorTitle: 'Invalid Phone Number',
            error: 'Phone Number must be between 8 and 10 digits',
            formulae: [8, 10]
        };
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
 * Downloads the Client Roster Mass Upload Template
 */
export const downloadClientRosterTemplate = async () => {
    try {
        const blob = await createClientRosterTemplate();

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const currentDate = new Date().toISOString().split('T')[0];
        link.download = `Client_Roster_Mass_Upload_Template_${currentDate}.xlsx`;

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
 * Parses an uploaded Client Roster Mass Upload Excel file
 * @param {File} file - The uploaded Excel file
 * @returns {Promise<Object>} Parsed data and validation results
 */
export const parseClientRosterTemplate = async (file) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);

        const worksheet = workbook.getWorksheet('Client Roster Mass Upload');

        if (!worksheet) {
            return {
                success: false,
                message: 'Invalid template: "Client Roster Mass Upload" sheet not found'
            };
        }

        const data = [];
        const errors = [];

        // Start from row 2 (skip header)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // Skip header

            const phoneCode = row.getCell(3).value?.toString().trim() || '';
            const phoneNumber = row.getCell(4).value?.toString().trim() || '';

            const rowData = {
                rowNumber,
                'Client Name': row.getCell(1).value?.toString().trim() || '',
                'Client Email': row.getCell(2).value?.toString().trim() || '',
                'Phone Number': phoneCode ? `${phoneCode} ${phoneNumber}` : phoneNumber,
            };

            // Skip empty rows
            const { rowNumber: _, ...userDataFields } = rowData;
            const hasData = Object.values(userDataFields).some(val => val !== '');
            if (!hasData) return;

            // Validate Email Address
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (rowData['Client Email'] && rowData['Client Email'] !== '' && !emailRegex.test(rowData['Client Email'])) {
                errors.push({
                    row: rowNumber,
                    field: 'Client Email',
                    message: `Invalid Email Address format: "${rowData['Client Email']}"`
                });
            }

            // Validate Phone Number
            const cleanCode = phoneCode.replace(/\D/g, '');
            const cleanNumber = phoneNumber.replace(/\D/g, '');

            if (cleanCode && cleanCode.length > 3) {
                errors.push({
                    row: rowNumber,
                    field: 'Phone Code',
                    message: `Phone Code must be max 3 digits`
                });
            }

            if (cleanNumber && (cleanNumber.length < 8 || cleanNumber.length > 10)) {
                errors.push({
                    row: rowNumber,
                    field: 'Phone Number',
                    message: `Phone Number must be between 8 and 10 digits`
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
