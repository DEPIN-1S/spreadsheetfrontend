export function parseGstPercent(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const match = String(value).match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 0;
}

export async function loadProductGstMap(invSheetsApi) {
    const gstByName = {};
    try {
        const sheetsRes = await invSheetsApi.list();
        const sheets = sheetsRes.data.data || [];
        await Promise.all(sheets.map(async (s) => {
            try {
                const full = await invSheetsApi.get(s.id);
                const rows = full.data.data?.rows || [];
                for (const r of rows) {
                    const gst = parseGstPercent(r.ccMeta?.gst);
                    if (!gst) continue;
                    const nameCell = (r.cells || []).find(c => c.columnId === 'col-product-name');
                    const name = String(nameCell?.rawValue || nameCell?.computedValue || '').trim().toLowerCase();
                    if (name) gstByName[name] = gst;
                }
            } catch {
                /* skip sheet */
            }
        }));
    } catch {
        /* ignore */
    }
    return gstByName;
}

export function inclusiveGstAmount(inclusiveTotal, rate) {
    const amt = Number(inclusiveTotal) || 0;
    const r = Number(rate) || 0;
    if (amt <= 0 || r <= 0) return 0;
    return amt - (amt / (1 + r / 100));
}
