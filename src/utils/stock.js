export function parseStockQty(value) {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
}

export function hasSellableStock(value) {
    return parseStockQty(value) > 0;
}

export function batchStatusFromQty(qty, notifiedQty = 0) {
    const q = parseStockQty(qty);
    const notified = parseStockQty(notifiedQty);
    if (q <= 0) return 'Out of Stock';
    if (notified > 0 && q < notified) return 'Low Stock';
    return 'Stock Available';
}

export function clampBillQty(requested, availableStock, { min = 1 } = {}) {
    const qty = parseStockQty(requested);
    const bounded = Math.max(min, qty);
    if (availableStock == null || availableStock === '') return bounded;
    return Math.min(bounded, parseStockQty(availableStock));
}
