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

function stripContentType(headers) {
    if (!headers) return;
    if (typeof headers.delete === "function") {
        headers.delete("Content-Type");
        return;
    }
    delete headers["Content-Type"];
    delete headers["content-type"];
}

// Attach JWT token on every request (same token as normal spreadsheet login)
inventoryApiClient.interceptors.request.use(
    (config) => {
        if (typeof FormData !== "undefined" && config.data instanceof FormData) {
            stripContentType(config.headers);
        }
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
        if (error.response?.status === 429) {
            const friendly = 'Too many requests. Wait a few minutes and try again.';
            error.message = error.response?.data?.message || error.response?.data?.error || friendly;
            if (error.response.data && typeof error.response.data === 'object' && !error.response.data.message) {
                error.response.data.message = error.message;
            }
            return Promise.reject(error);
        }
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

let listAllBatchesPromise = null;

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
    updateRowStyle: (sheetId, rowId, styles) => inventoryApiClient.patch(`/inv-sheets/${sheetId}/rows/${rowId}/style`, { styles }),
    updateCcRowStyle: (sheetId, rowId, ccRowId, styles) => inventoryApiClient.patch(`/inv-sheets/${sheetId}/rows/${rowId}/cc-rows/${ccRowId}/style`, { styles }),
    listAllBatches: () => {
        if (!listAllBatchesPromise) {
            listAllBatchesPromise = inventoryApiClient.get('/inv-sheets/batches').catch((err) => {
                listAllBatchesPromise = null;
                return Promise.reject(err);
            });
        } else {
            // #region agent log
            fetch('http://127.0.0.1:7829/ingest/b00fc416-9345-4f2c-9b2d-b996219acb62',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'55a922'},body:JSON.stringify({sessionId:'55a922',runId:'post-fix',hypothesisId:'C',location:'inventoryApiClient.js:listAllBatches',message:'batch list cache hit',data:{cached:true,httpRequests:0},timestamp:Date.now()})}).catch(()=>{});
            // #endregion
        }
        return listAllBatchesPromise;
    }
};

export const invMastersApi = {
    list: (type) => inventoryApiClient.get(`/inv/masters/${type}`),
    add: (type, value) => inventoryApiClient.post(`/inv/masters/${type}`, typeof value === 'object' ? value : { value }),
    create: (type, data) => inventoryApiClient.post(`/inv/masters/${type}`, typeof data === 'object' ? data : { value: data }),
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
