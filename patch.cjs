const fs = require('fs');
const path = 'c:\\jithin-pm\\Work\\Spreadsheet\\business-spreadsheet-backend\\src\\features\\template\\template.model.js';
let data = fs.readFileSync(path, 'utf8');
data = data.replace('spreadsheetId: { type: DataTypes.UUID, allowNull: true },', 'spreadsheetId: { type: DataTypes.UUID, allowNull: true },\n    spreadsheetIds: { type: DataTypes.JSON, allowNull: true },');
fs.writeFileSync(path, data);
console.log('patched');
