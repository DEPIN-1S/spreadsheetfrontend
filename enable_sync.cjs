const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'business-spreadsheet-backend', 'src', 'spreadsheet.js');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/sequelize\s*\.\s*sync\(\{\s*alter:\s*false\s*\}\)/g, 'sequelize.sync({ alter: true })');
fs.writeFileSync(file, content);
console.log('Set alter: true in spreadsheet.js');
