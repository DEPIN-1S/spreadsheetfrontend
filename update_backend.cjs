const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'business-spreadsheet-backend');
const freelanceDir = path.join(backendDir, 'src', 'features', 'freelance');

if (!fs.existsSync(freelanceDir)) {
    fs.mkdirSync(freelanceDir, { recursive: true });
}

// 1. Create freelance.model.js
const modelCode = `
import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';
import User from '../user/user.model.js';

export const FreelanceTemplate = sequelize.define('FreelanceTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: 'id' } },
    templateName: { type: DataTypes.STRING, allowNull: true },
    columns: { type: DataTypes.JSON, allowNull: true },
    fromDetails: { type: DataTypes.JSON, allowNull: true },
    toDetails: { type: DataTypes.JSON, allowNull: true },
    logo: { type: DataTypes.TEXT, allowNull: true },
    paymentModes: { type: DataTypes.JSON, allowNull: true },
    sealImage: { type: DataTypes.TEXT, allowNull: true },
    signatureImage: { type: DataTypes.TEXT, allowNull: true },
    layout: { type: DataTypes.JSON, allowNull: true }
});

export const FreelanceInvoice = sequelize.define('FreelanceInvoice', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    userId: { type: DataTypes.UUID, allowNull: false, references: { model: User, key: 'id' } },
    invoiceNo: { type: DataTypes.STRING, allowNull: true },
    date: { type: DataTypes.STRING, allowNull: true },
    clientName: { type: DataTypes.STRING, allowNull: true },
    templateName: { type: DataTypes.STRING, allowNull: true },
    grandTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    items: { type: DataTypes.JSON, allowNull: true },
    totals: { type: DataTypes.JSON, allowNull: true },
    template: { type: DataTypes.JSON, allowNull: true }
});

User.hasMany(FreelanceTemplate, { foreignKey: 'userId', as: 'freelanceTemplates' });
FreelanceTemplate.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(FreelanceInvoice, { foreignKey: 'userId', as: 'freelanceInvoices' });
FreelanceInvoice.belongsTo(User, { foreignKey: 'userId', as: 'user' });
`;
fs.writeFileSync(path.join(freelanceDir, 'freelance.model.js'), modelCode);

// 2. Create freelance.controller.js
const controllerCode = `
import { FreelanceTemplate, FreelanceInvoice } from './freelance.model.js';

export const getTemplates = async (req, res, next) => {
    const templates = await FreelanceTemplate.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: templates });
};

export const createTemplate = async (req, res, next) => {
    const template = await FreelanceTemplate.create({ ...req.body, userId: req.user.id });
    res.json({ success: true, data: template });
};

export const updateTemplate = async (req, res, next) => {
    await FreelanceTemplate.update(req.body, { where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
};

export const deleteTemplate = async (req, res, next) => {
    await FreelanceTemplate.destroy({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
};

export const getInvoices = async (req, res, next) => {
    const invoices = await FreelanceInvoice.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: invoices });
};

export const createInvoice = async (req, res, next) => {
    const invoice = await FreelanceInvoice.create({ ...req.body, userId: req.user.id });
    res.json({ success: true, data: invoice });
};

export const deleteInvoice = async (req, res, next) => {
    await FreelanceInvoice.destroy({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ success: true });
};
`;
fs.writeFileSync(path.join(freelanceDir, 'freelance.controller.js'), controllerCode);

// 3. Create freelance.routes.js
const routesCode = `
import express from 'express';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, getInvoices, createInvoice, deleteInvoice } from './freelance.controller.js';
import { protect } from '../../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.route('/templates').get(getTemplates).post(createTemplate);
router.route('/templates/:id').put(updateTemplate).delete(deleteTemplate);

router.route('/invoices').get(getInvoices).post(createInvoice);
router.route('/invoices/:id').delete(deleteInvoice);

export default router;
`;
fs.writeFileSync(path.join(freelanceDir, 'freelance.routes.js'), routesCode);

// 4. Update app.js
const appJsPath = path.join(backendDir, 'src', 'app.js');
let appJsContent = fs.readFileSync(appJsPath, 'utf8');

if (!appJsContent.includes('freelanceRoutes')) {
    appJsContent = appJsContent.replace(
        'import templateRoutes from "./features/template/template.routes.js";',
        'import templateRoutes from "./features/template/template.routes.js";\\nimport freelanceRoutes from "./features/freelance/freelance.routes.js";'
    );
    appJsContent = appJsContent.replace(
        'app.use("/api/templates", templateRoutes);',
        'app.use("/api/templates", templateRoutes);\\napp.use("/api/freelance", freelanceRoutes);'
    );
    fs.writeFileSync(appJsPath, appJsContent);
}

// 5. Update associations.js
const assocPath = path.join(backendDir, 'src', 'config', 'associations.js');
let assocContent = fs.readFileSync(assocPath, 'utf8');
if (!assocContent.includes('freelance.model.js')) {
    assocContent += '\\nimport "../features/freelance/freelance.model.js";\\n';
    fs.writeFileSync(assocPath, assocContent);
}

console.log("Backend updated successfully. Remember to sync DB to create tables.");
