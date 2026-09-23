const fs = require('fs');
const path = 'c:\\jithin-pm\\Work\\Spreadsheet\\business-spreadsheet-backend\\src\\spreadsheet.js';
let data = fs.readFileSync(path, 'utf8');
if (!data.includes("'businesses', 'seals'")) {
    data = data.replace(
        "await alterQuery('templates', 'spreadsheetIds', 'LONGTEXT NULL');",
        "await alterQuery('templates', 'spreadsheetIds', 'LONGTEXT NULL');\n    await alterQuery('businesses', 'seals', 'LONGTEXT NULL');"
    );
    fs.writeFileSync(path, data);
    console.log('Backend spreadsheet.js patched.');
} else {
    console.log('Already patched.');
}
