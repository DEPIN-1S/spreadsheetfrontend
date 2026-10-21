/**
 * Utility to generate sanitized file names for invoice PDFs,
 * handle invoice date parsing/formatting,
 * and trigger print dialogs with document.title set appropriately.
 */

/**
 * Combines invoice number and date into a filesystem-safe string suitable for PDF file naming.
 * Example outputs: "INV-2026-001_2026-10-17", "BR-26-1025_17-10-2026"
 *
 * @param {string} [invoiceNo] - The invoice number
 * @param {string|Date} [date] - The invoice date
 * @returns {string} - Clean combination of invoice no and date
 */
export function getInvoicePdfFilename(invoiceNo, date) {
    let cleanInv = String(invoiceNo || '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '_');

    if (!cleanInv) {
        cleanInv = 'Invoice';
    }

    let cleanDate = '';
    if (date) {
        if (date instanceof Date && !isNaN(date.getTime())) {
            cleanDate = date.toISOString().split('T')[0];
        } else if (typeof date === 'string') {
            const trimmed = date.trim();
            // Check if string starts with ISO date YYYY-MM-DD
            const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}/);
            if (isoMatch) {
                cleanDate = isoMatch[0];
            } else {
                // Otherwise replace slashes, colons, or invalid chars with hyphens
                cleanDate = trimmed
                    .replace(/[\\/:*?"<>|]+/g, '-')
                    .replace(/\s+/g, '_');
            }
        }
    }

    if (!cleanDate) {
        cleanDate = new Date().toISOString().split('T')[0];
    }

    return `${cleanInv}_${cleanDate}`;
}

/**
 * Triggers window.print() while temporarily setting document.title to the
 * invoice filename so that browser "Save as PDF" defaults to that name.
 * Automatically restores the original document title after printing.
 *
 * @param {string} [invoiceNo] - The invoice number
 * @param {string|Date} [date] - The invoice date
 */
export function printInvoiceWithTitle(invoiceNo, date) {
    const fileName = getInvoicePdfFilename(invoiceNo, date);
    const originalTitle = document.title;

    try {
        document.title = fileName;
    } catch (_e) {
        // Ignore if document.title cannot be updated
    }

    let restored = false;
    const restore = () => {
        if (!restored) {
            restored = true;
            try {
                document.title = originalTitle;
            } catch (_e) {
                // Ignore title restoration failure
            }
            window.removeEventListener('afterprint', restore);
        }
    };

    window.addEventListener('afterprint', restore);

    try {
        window.print();
    } finally {
        // Fallback restoration in case afterprint does not fire in some browsers
        setTimeout(restore, 2000);
    }
}

/**
 * Formats a date string (ISO YYYY-MM-DD or other) to DD/MM/YYYY for invoice display.
 *
 * @param {string|Date} val
 * @returns {string} - Formatted DD/MM/YYYY or original string
 */
export function formatDateDMY(val) {
    if (!val) return '';
    const str = String(val).trim();
    if (str.includes('/')) return str;
    if (str.includes('-')) {
        const parts = str.split('T')[0].split('-');
        if (parts.length === 3) {
            const [y, m, d] = parts;
            return `${d}/${m}/${y}`;
        }
    }
    return str;
}

/**
 * Normalizes any date string (ISO, DD/MM/YYYY, or DD-MM-YYYY) to YYYY-MM-DD
 * so it can be passed as the value for an HTML5 <input type="date" />.
 *
 * @param {string|Date} val
 * @returns {string} - YYYY-MM-DD format
 */
export function toDateInputValue(val) {
    if (!val) return '';
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        return str.substring(0, 10);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [d, m, y] = str.split('/');
        return `${y}-${m}-${d}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
        const [d, m, y] = str.split('-');
        return `${y}-${m}-${d}`;
    }
    return '';
}

/**
 * Determines whether a column should be treated as a Date column.
 * Matches if the column type is "date", or if the column name is or contains "date".
 *
 * @param {string} colName
 * @param {Object} [colTypes]
 * @returns {boolean}
 */
export function isDateColumn(colName, colTypes = {}) {
    if (!colName) return false;
    const type = colTypes && colTypes[colName] ? String(colTypes[colName]).toLowerCase() : '';
    if (type === 'date') return true;
    const name = String(colName).trim().toLowerCase();
    return name === 'date' || name.includes('date');
}
