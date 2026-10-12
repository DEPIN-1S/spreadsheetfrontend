const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'business-spreadsheet-backend', 'src', 'features', 'freelance', 'freelance.model.js');
let content = fs.readFileSync(file, 'utf8');
content = content.replace("import sequelize from '../../config/database.js';", "import sequelize from '../../config/db.js';");
fs.writeFileSync(file, content);
console.log('Fixed database.js to db.js');
