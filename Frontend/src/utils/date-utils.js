/**
 * Formats a Date object to 'DD-MMM-YYYY' string (e.g., '07-APR-2026')
 * This follows the format expected by the backend and used throughout the application.
 * @param {Date|string|undefined} dateInput - The date to format
 * @returns {string} - Formatted date string
 */
export const formatDateToBackend = (dateInput) => {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Gets the current date formatted for the backend
 * @returns {string} - Formatted current date
 */
export const getCurrentDateFormatted = () => {
    return formatDateToBackend(new Date());
};

/**
 * Checks if a date string is in the correct 'DD-MMM-YYYY' format
 * @param {string} dateString
 * @returns {boolean}
 */
export const isValidBackendDate = (dateString) => {
    const regex = /^\d{2}-[A-Z]{3}-\d{4}$/;
    return regex.test(dateString);
};

export default {
    formatDateToBackend,
    getCurrentDateFormatted,
    isValidBackendDate
};
