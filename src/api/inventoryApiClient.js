/**
 * inventoryApiClient.js
 * 
 * Separate axios instance for all inventory backend API calls.
 * - Points to same backend (VITE_API_BASE_URL) but uses /inv- and /inv/ prefix routes
 * - Shares the same JWT token from localStorage as the normal spreadsheet client
 * - Zero conflict with normal apiClient — completely separate instance
 */
import axios from 'axios';

const inventoryApiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:6041/api',
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token on every request (same token as normal spreadsheet login)
inventoryApiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        return config;
    },
    (error) => Promise.reject(error)
);

// On 401 → redirect to login
inventoryApiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('accessToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Convenience API methods
// ─────────────────────────────────────────────────────────────────────────────

export const invFoldersApi = {
    list: (parentId) => inventoryApiClient.get('/inv-folders', { params: parentId !== undefined ? { parentId } : {} }),
    create: (data) => inventoryApiClient.post('/inv-folders', data),
    update: (id, data) => inventoryApiClient.put(`/inv-folders/${id}`, data),
    delete: (id) => inventoryApiClient.delete(`/inv-folders/${id}`)
};

export const invSheetsApi = {
    list: (folderId) => inventoryApiClient.get('/inv-sheets', { params: folderId !== undefined ? { folderId } : {} }),
    create: (data) => inventoryApiClient.post('/inv-sheets', data),
    get: (id) => inventoryApiClient.get(`/inv-sheets/${id}`),
    update: (id, data) => inventoryApiClient.put(`/inv-sheets/${id}`, data),
    delete: (id) => inventoryApiClient.delete(`/inv-sheets/${id}`),
    addRow: (sheetId) => inventoryApiClient.post(`/inv-sheets/${sheetId}/rows`),
    deleteRow: (sheetId, rowId) => inventoryApiClient.delete(`/inv-sheets/${sheetId}/rows/${rowId}`),
    updateCells: (sheetId, rowId, cells) => inventoryApiClient.put(`/inv-sheets/${sheetId}/rows/${rowId}/cells`, { cells }),
    getCcMeta: (sheetId, rowId) => inventoryApiClient.get(`/inv-sheets/${sheetId}/rows/${rowId}/cc-meta`),
    updateCcMeta: (sheetId, rowId, data) => inventoryApiClient.put(`/inv-sheets/${sheetId}/rows/${rowId}/cc-meta`, data),
    listCcRows: (sheetId, rowId) => inventoryApiClient.get(`/inv-sheets/${sheetId}/rows/${rowId}/cc-rows`),
    addCcRow: (sheetId, rowId) => inventoryApiClient.post(`/inv-sheets/${sheetId}/rows/${rowId}/cc-rows`),
    deleteCcRow: (sheetId, rowId, ccRowId) => inventoryApiClient.delete(`/inv-sheets/${sheetId}/rows/${rowId}/cc-rows/${ccRowId}`),
    updateCcCells: (sheetId, rowId, ccRowId, cells) => inventoryApiClient.put(`/inv-sheets/${sheetId}/rows/${rowId}/cc-rows/${ccRowId}/cells`, { cells }),
    listAllBatches: () => inventoryApiClient.get('/inv-sheets/batches')
};

export const invMastersApi = {
    list: (type) => inventoryApiClient.get(`/inv/masters/${type}`),
    add: (type, value) => inventoryApiClient.post(`/inv/masters/${type}`, { value }),
    delete: (type, id) => inventoryApiClient.delete(`/inv/masters/${type}/${id}`)
};

export const invPartiesApi = {
    list: (type) => inventoryApiClient.get(`/inv/parties/${type}`),
    create: (type, data) => inventoryApiClient.post(`/inv/parties/${type}`, data),
    update: (type, id, data) => inventoryApiClient.put(`/inv/parties/${type}/${id}`, data),
    delete: (type, id) => inventoryApiClient.delete(`/inv/parties/${type}/${id}`)
};

export const invInvoicesApi = {
    list: (type) => inventoryApiClient.get('/inv/invoices', { params: type ? { type } : {} }),
    create: (data) => inventoryApiClient.post('/inv/invoices', data),
    get: (id) => inventoryApiClient.get(`/inv/invoices/${id}`),
    update: (id, data) => inventoryApiClient.put(`/inv/invoices/${id}`, data),
    delete: (id) => inventoryApiClient.delete(`/inv/invoices/${id}`)
};

export const invLedgerApi = {
    list: (type) => inventoryApiClient.get('/inv/ledger', { params: type ? { type } : {} }),
    update: (id, data) => inventoryApiClient.patch(`/inv/ledger/${id}`, data)
};

export default inventoryApiClient;
