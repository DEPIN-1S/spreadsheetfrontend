const fs = require('fs');
const path = 'c:\\jithin-pm\\Work\\Spreadsheet\\business-spreadsheet-backend\\src\\features\\business\\business.model.js';
let data = fs.readFileSync(path, 'utf8');
if (!data.includes('seals: { type: DataTypes.JSON')) {
    data = data.replace(
        'additionalData: { type: DataTypes.JSON, defaultValue: [] },',
        'additionalData: { type: DataTypes.JSON, defaultValue: [] },\n    seals: { type: DataTypes.JSON, defaultValue: [] },'
    );
    fs.writeFileSync(path, data);
    console.log('Backend model patched.');
} else {
    console.log('Already patched.');
}
