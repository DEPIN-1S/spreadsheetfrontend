const fs = require('fs');
const path = 'c:\\jithin-pm\\Work\\Spreadsheet\\business-spreadsheet-backend\\src\\features\\business\\business.controller.js';
let data = fs.readFileSync(path, 'utf8');

data = data.replace(
    'const { name, isProductBased, columns, logo, additionalData, sharedUsers, spreadsheetId } = req.body;',
    'const { name, isProductBased, columns, logo, additionalData, sharedUsers, spreadsheetId, seals } = req.body;'
);
data = data.replace(
    'additionalData: additionalData || [],',
    'additionalData: additionalData || [],\n            seals: seals || [],'
);
data = data.replace(
    'const { name, isProductBased, columns, logo, additionalData, sharedUsers, spreadsheetId } = req.body;',
    'const { name, isProductBased, columns, logo, additionalData, sharedUsers, spreadsheetId, seals } = req.body;'
);
data = data.replace(
    'if (additionalData !== undefined) business.additionalData = additionalData;',
    'if (additionalData !== undefined) business.additionalData = additionalData;\n        if (seals !== undefined) business.seals = seals;'
);
fs.writeFileSync(path, data);
console.log('business.controller.js patched.');
