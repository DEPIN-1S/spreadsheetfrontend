import React, { useState, useMemo, useEffect } from 'react';
import { FiX, FiFileText, FiEye } from 'react-icons/fi';

export default function PartyInvoicesModal({
    isOpen,
    onClose,
    party,
    allInvoices = [],
    onViewInvoice
}) {
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 5;

    useEffect(() => {
        setCurrentPage(1);
    }, [party?.id, isOpen]);

    // Filter invoices matching this party
    const partyInvoices = useMemo(() => {
        if (!party) return [];
        const pId = party.id ? String(party.id) : null;
        const pName = (party.name || '').trim().toLowerCase();
        const pContact = (party.contact || '').trim();

        return (allInvoices || []).filter(inv => {
            if (!inv) return false;
            let fullData = inv.fullData;
            if (typeof fullData === 'string') {
                try { fullData = JSON.parse(fullData); } catch (e) { fullData = {}; }
            }
            // 1. Direct partyId match
            if (pId && (String(inv.partyId) === pId || String(fullData?.party?.id) === pId)) {
                return true;
            }
            // 2. Name match (case-insensitive)
            const invName = (inv.partyName || fullData?.party?.name || '').trim().toLowerCase();
            if (pName && invName && invName === pName) {
                return true;
            }
            // 3. Contact match
            const invContact = (fullData?.party?.contact || '').trim();
            if (pContact && invContact && invContact === pContact) {
                return true;
            }
            return false;
        });
    }, [party, allInvoices]);

    // Helper to calculate total amount for each invoice
    const getInvoiceTotal = (inv) => {
        if (!inv) return 0;
        let fullData = inv.fullData;
        if (typeof fullData === 'string') {
            try { fullData = JSON.parse(fullData); } catch (e) { fullData = {}; }
        }
        if (inv.total && inv.total !== '0.00' && inv.total !== '0') return parseFloat(inv.total) || 0;
        if (inv.grandTotal && inv.grandTotal !== '0.00' && inv.grandTotal !== '0') return parseFloat(inv.grandTotal) || 0;
        const fullTotals = fullData?.totals;
        if (fullTotals?.manualGrandTotal) return parseFloat(fullTotals.manualGrandTotal) || 0;
        if (fullTotals?.grandTotal && fullTotals.grandTotal !== '0.00' && fullTotals.grandTotal !== '0') return parseFloat(fullTotals.grandTotal) || 0;
        if (fullData?.items && Array.isArray(fullData.items)) {
            const itms = fullData.items;
            const gross = itms.reduce((s, it) => s + (parseFloat(it.Total) || ((parseFloat(it.Qty) || 0) * (parseFloat(it['Selling Rate']) || parseFloat(it['MRP']) || 0))), 0);
            const gst = itms.reduce((s, it) => {
                const lineTotal = parseFloat(it.Total) || ((parseFloat(it.Qty) || 0) * (parseFloat(it['Selling Rate']) || parseFloat(it['MRP']) || 0));
                return s + (lineTotal * (parseFloat(it.GST) || 0) / 100);
            }, 0);
            const gVal = parseFloat(fullTotals?.grossAmt) || gross;
            const gstV = parseFloat(fullTotals?.totalGst) || gst;
            const dVal = parseFloat(fullTotals?.disAmt) || 0;
            const aVal = parseFloat(fullTotals?.addlChg) || 0;
            const rVal = parseFloat(fullTotals?.rOff) || 0;
            return gVal - dVal + aVal + gstV + rVal;
        }
        return 0;
    };

    const totalPages = Math.max(1, Math.ceil(partyInvoices.length / pageSize));
    const paginatedInvoices = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return partyInvoices.slice(start, start + pageSize);
    }, [partyInvoices, currentPage, pageSize]);

    if (!isOpen || !party) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95">
                
                {/* Modal Header */}
                <div className="px-6 py-5 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0 border border-indigo-100/60 shadow-2xs">
                            <FiFileText size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                    Invoices for {party.name}
                                </h3>
                                <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                    {partyInvoices.length} {partyInvoices.length === 1 ? 'Invoice' : 'Invoices'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                        title="Close"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Invoices List / Table */}
                <div className="flex-1 overflow-y-auto p-6">
                    {partyInvoices.length === 0 ? (
                        /* Empty State: No Invoices for this party */
                        <div className="text-center py-12 px-4 max-w-md mx-auto">
                            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                                <FiFileText size={28} />
                            </div>
                            <h4 className="text-base font-bold text-gray-800">No Invoices Found</h4>
                            <p className="text-xs text-gray-500 mt-1">
                                There are no invoices generated for <span className="font-semibold text-gray-700">{party.name}</span> in this business yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-2xs">
                            <table className="w-full text-left border-collapse min-w-[650px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-5 py-3">Invoice No</th>
                                        <th className="px-5 py-3">Date & Time</th>
                                        <th className="px-5 py-3">Payment Mode</th>
                                        <th className="px-5 py-3 text-right">Amount</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs">
                                    {paginatedInvoices.map((inv) => {
                                        let fullData = inv.fullData;
                                        if (typeof fullData === 'string') {
                                            try { fullData = JSON.parse(fullData); } catch (e) { fullData = {}; }
                                        }
                                        const amount = getInvoiceTotal(inv);
                                        const tName = inv.templateName || 
                                                      fullData?.template?.name || 
                                                      (typeof fullData?.template === 'string' ? fullData.template : '') || 
                                                      (fullData?.template?.title || '');
                                        const paymentMethod = inv.paymentMethod || fullData?.paymentMethod || 'Cash';

                                        return (
                                            <tr 
                                                key={inv.id || Math.random()} 
                                                className={inv.isCb ? 'bg-amber-50/80 hover:bg-amber-100/70 border-l-4 border-l-amber-500 transition-colors' : 'hover:bg-indigo-50/40 transition-colors'}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-indigo-600 text-xs">
                                                            {inv.invoiceNo || 'N/A'}
                                                        </span>
                                                        {inv.isCb && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wide">
                                                                CB
                                                            </span>
                                                        )}
                                                    </div>
                                                    {tName && (
                                                        <div className="text-[11px] text-gray-400 mt-0.5 font-normal">
                                                            {tName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-600">
                                                    <div>{inv.date || '—'}</div>
                                                    {inv.time && <div className="text-[10px] text-gray-400 mt-0.5">{inv.time}</div>}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-700 font-semibold rounded-md text-[10px] uppercase tracking-wider border border-gray-200">
                                                        {paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right font-black text-gray-900 text-sm">
                                                    ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    {onViewInvoice && (
                                                        <button
                                                            onClick={() => {
                                                                onClose();
                                                                onViewInvoice(inv);
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                                            title="View Invoice"
                                                        >
                                                            <FiEye size={16} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {partyInvoices.length > 0 && (
                        <div className="flex items-center justify-between mt-4 px-2">
                            <span className="text-sm text-gray-500">
                                Page {currentPage} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <span className="text-xs text-gray-400">
                        Party: <span className="font-semibold text-gray-700">{party.name}</span>
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-xl transition-colors"
                    >
                        Close
                    </button>
                </div>

            </div>
        </div>
    );
}
