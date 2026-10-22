export function parseGstPercent(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const match = String(value).match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 0;
}

let gstMapPromise = null;

export function loadProductGstMap(invSheetsApi) {
    if (gstMapPromise) {
        // #region agent log
        fetch('http://127.0.0.1:7829/ingest/b00fc416-9345-4f2c-9b2d-b996219acb62',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'55a922'},body:JSON.stringify({sessionId:'55a922',runId:'post-fix',hypothesisId:'B',location:'gst.js:loadProductGstMap',message:'gst map cache hit',data:{cached:true,requestCount:0},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return gstMapPromise;
    }
    gstMapPromise = buildProductGstMap(invSheetsApi);
    return gstMapPromise;
}

async function buildProductGstMap(invSheetsApi) {
    const gstByName = {};
    try {
        const sheetsRes = await invSheetsApi.list();
        const sheets = sheetsRes.data.data || [];
        // #region agent log
        fetch('http://127.0.0.1:7829/ingest/b00fc416-9345-4f2c-9b2d-b996219acb62',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'55a922'},body:JSON.stringify({sessionId:'55a922',runId:'pre-fix',hypothesisId:'B',location:'gst.js:loadProductGstMap',message:'gst map sheet fan-out',data:{sheetCount:sheets.length,requestCount:1+sheets.length},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
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
        gstMapPromise = null;
    }
    return gstByName;
}

export function gstByProductName(batches) {
    const gstByName = {};
    for (const item of batches || []) {
        const gst = parseGstPercent(item.gstPercent ?? item.gst);
        const name = String(item.name || '').trim().toLowerCase();
        if (gst && name) gstByName[name] = gst;
    }
    return gstByName;
}

export function inclusiveGstAmount(inclusiveTotal, rate) {
    const amt = Number(inclusiveTotal) || 0;
    const r = Number(rate) || 0;
    if (amt <= 0 || r <= 0) return 0;
    return amt - (amt / (1 + r / 100));
}
