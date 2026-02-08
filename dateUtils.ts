
/**
 * Formats a date string from YYYY-MM-DD to dd/mm/yyyy
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Formatted date string in dd/mm/yyyy or original string if invalid format
 */
export const formatDate = (dateString: string): string => {
    if (!dateString) return '';

    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;

    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
};
