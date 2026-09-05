import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiPrinter, FiDownload, FiCheckCircle, FiSettings } from 'react-icons/fi';
import { invInvoicesApi } from '../api/inventoryApiClient';
import { parseGstPercent } from '../utils/gst';

export default function PharmaInvoiceModal({ isOpen, onClose, invoice }) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef(null);

    const [fullInvoiceData, setFullInvoiceData] = useState(invoice);
    const [loadingInvoice, setLoadingInvoice] = useState(false);

    const [visibleColumns, setVisibleColumns] = useState({
        slNo: true,
        product: true,
        qty: true,
        batchNo: true,
        expDate: true,
        sellingRate: true,
        disc: true,
        mrp: true,
        gst: true,
        total: true
    });

    useEffect(() => {
        setFullInvoiceData(invoice);
        const isSavedInvoiceUUID = invoice?.id && typeof invoice.id === 'string' && invoice.id.length > 20 && !invoice.id.startsWith('INV-');
        if (isSavedInvoiceUUID) {
            setLoadingInvoice(true);
            invInvoicesApi.get(invoice.id)
                .then(res => {
                    if (res.data?.data) {
                        setFullInvoiceData(res.data.data);
                    }
                })
                .catch(err => console.error("Error loading invoice details:", err))
                .finally(() => setLoadingInvoice(false));
        }
    }, [invoice]);

    useEffect(() => {
        const saved = localStorage.getItem('invoice_visible_columns');
        if (saved) {
            try {
                setVisibleColumns(JSON.parse(saved));
            } catch (err) {
                console.error("Failed to parse invoice visible columns:", err);
            }
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen || !invoice) return null;

    const toggleColumn = (key) => {
        const updated = { ...visibleColumns, [key]: !visibleColumns[key] };
        setVisibleColumns(updated);
        localStorage.setItem('invoice_visible_columns', JSON.stringify(updated));
    };

    const safeNum = (val, fallback = 0) => {
        const n = Number(val);
        return isNaN(n) ? fallback : n;
    };

    const currentInv = fullInvoiceData || invoice;

    // Extract invoice fields
    const invoiceNo = currentInv.invoiceNo || currentInv.id || 'BR-26-1025';
    const date = currentInv.invoiceDate || currentInv.date || new Date().toISOString().split('T')[0];
    const paymentMethod = currentInv.paymentMethod || 'CASH';

    // Format Date & Time
    const rawDateStr = currentInv.createdAt || currentInv.invoiceDate || currentInv.date;
    let invDateObj = rawDateStr ? new Date(rawDateStr) : new Date();
    if (isNaN(invDateObj.getTime())) {
        invDateObj = new Date();
    }

    const formatTime = (d) => {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formattedInvDate = date;
    const formattedInvTime = formatTime(invDateObj);
    const formattedPrintTime = formatTime(new Date());
    
    // Extract customer / party details
    const partyName = currentInv.partyName || (currentInv.party && currentInv.party.name) || 'WALK-IN CUSTOMER';
    const partyBillingAddress = (currentInv.party && (currentInv.party.billingAddress || currentInv.party.address)) || (currentInv.billingAddress) || 'KILIMINOOR, THIRUVANANTHAPURAM - 695601';
    const partyShippingAddress = (currentInv.party && currentInv.party.shippingAddress) || (currentInv.shippingAddress) || '';
    const partyAddress = partyBillingAddress; // kept for non-wholesale fallback
    const partyContact = (currentInv.party && currentInv.party.contact) || '';
    const partyCode = (currentInv.party && currentInv.party.id) ? `Code A30${currentInv.party.id}` : 'Code A373';
    const partyDl = (currentInv.party && currentInv.party.dlNo) || '';
    const partyGstin = (currentInv.party && currentInv.party.gstin) || (currentInv.party && currentInv.party.gstinNo) || '';
    const partyPan = (currentInv.party && currentInv.party.pan) || (currentInv.party && currentInv.party.panNo) || '';
    const isWholesale = currentInv.type === 'Wholesale' || currentInv.type === 'wholesale';
    // Show shipping section only if it exists and differs from billing
    const showShipping = isWholesale && partyShippingAddress && partyShippingAddress !== partyBillingAddress;

    // Extract line items
    let rawItems = currentInv.items || [];
    if (rawItems.length === 0 && !currentInv.id) {
        // Fallback for preview mode when no ID exists
        rawItems = [
            { id: 1, description: 'INSUTREND 30/70 REFILL', qty: 10, price: 284.00, batch: 'A042517682', expiry: '11/28', mrp: 355.00, gst: 5 },
            { id: 2, description: 'INSUTREND 50/50 REFILL', qty: 10, price: 260.00, batch: 'A042517622', expiry: '08/28', mrp: 325.00, gst: 5 }
        ];
    }

    // Normalize items
    const items = rawItems.map((item, idx) => {
        const price = safeNum(item.price);
        const qty = safeNum(item.qty, 1);
        const mrpVal = safeNum(item.mrp, price > 0 ? price * 1.25 : 0);
        const gstPercent = parseGstPercent(item.gstPercent ?? item.gst);

        let disVal = safeNum(item.marginPercent || item.disPercent || item.discount || item.wholesaleMargin);
        if (disVal === 0 && mrpVal > 0 && price > 0) {
            if (isWholesale) {
                // Wholesale Margin % = ((MRP - W Selling Rate) / W Selling Rate) * 100
                disVal = ((mrpVal - price) / price) * 100;
            } else {
                // Retail Discount % = ((MRP - R Selling Rate) / MRP) * 100
                disVal = ((mrpVal - price) / mrpVal) * 100;
            }
        }
        disVal = Math.max(0, disVal);

        return {
            id: item.id || idx + 1,
            rack: item.rack || `R-${idx + 1}`,
            mkt: item.mkt || 'ANTHE',
            description: item.description || item.name || 'MEDICINE PRODUCT',
            pack: item.pack || '1',
            qty: qty,
            scheme: item.scheme || '+0',
            batch: item.batch || `-`,
            expiry: item.expiry || item.expDate || `-`,
            mrp: mrpVal,
            tradePrice: price,
            scmPercent: safeNum(item.scmPercent),
            disPercent: disVal,
            marginPercent: disVal,
            gstPercent: gstPercent,
            hsnCode: item.hsnCode || item.hsn || '30043110',
            value: qty * price
        };
    });

    const totalQty = items.reduce((acc, item) => acc + safeNum(item.qty), 0);
    const itemSubtotal = items.reduce((acc, item) => acc + safeNum(item.value), 0);
    const gstRate = safeNum(currentInv.gstRate ?? 5);
    const taxAmount = safeNum(currentInv.taxAmount ?? (itemSubtotal * (gstRate / 100)));
    const taxableSubtotal = safeNum(currentInv.subtotal ?? Math.max(0, itemSubtotal - taxAmount));

    const rawAddlCharges = currentInv.additionalCharges || currentInv.additional_charges || [];
    const addlChargesList = Array.isArray(rawAddlCharges) && rawAddlCharges.length > 0
        ? rawAddlCharges.map(c => ({
            name: c.name || 'Addl Chg',
            amount: safeNum(c.amount),
            gstRate: safeNum(c.gstRate ?? c.gst ?? 18)
        }))
        : (safeNum(currentInv.additionalChargesAmount) > 0 ? [{ name: 'Addl Chg', amount: safeNum(currentInv.additionalChargesAmount), gstRate: 18 }] : []);

    const totalAddlChargesTotal = addlChargesList.reduce((acc, c) => acc + c.amount, 0);
    const addlChargesTaxSum = addlChargesList.reduce((acc, c) => {
        const amt = c.amount;
        const rate = c.gstRate;
        return acc + (rate > 0 ? (amt - (amt / (1 + rate / 100))) : 0);
    }, 0);
    const addlChargesBaseSum = totalAddlChargesTotal - addlChargesTaxSum;

    // Calculate product items tax correctly (Inclusive of GST)
    const productTaxSum = items.reduce((acc, item) => {
        const rate = parseGstPercent(item.gstPercent);
        const val = safeNum(item.value);
        return acc + (rate > 0 ? (val - (val / (1 + rate / 100))) : 0);
    }, 0);
    const productBaseSum = itemSubtotal - productTaxSum;

    const totalInvoiceGst = productTaxSum + addlChargesTaxSum;
    const totalInvoiceTaxable = productBaseSum + addlChargesBaseSum;

    const grandTotal = safeNum(currentInv.grandTotal ?? (productBaseSum + productTaxSum + totalAddlChargesTotal - safeNum(currentInv.discountAmount) + safeNum(currentInv.roundOffAmount)));

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #pharma-invoice-print-area, #pharma-invoice-print-area * {
                        visibility: visible !important;
                    }
                    #pharma-invoice-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>

            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[95vh]">
                
                {/* Modal Action Bar (Hidden in Print) */}
                <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between no-print border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-indigo-600 text-xs font-bold rounded uppercase tracking-wider">Tax Invoice</span>
                        <h3 className="text-base font-semibold">Company Name Pharma Distribution Format</h3>
                        {loadingInvoice && <span className="text-xs text-indigo-300 animate-pulse ml-2">Loading details...</span>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                        >
                            <FiDownload size={15} />
                            Download
                        </button>
                        <div className="relative" ref={settingsRef}>
                            <button
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors border ${isSettingsOpen ? 'bg-gray-800 text-white border-gray-700' : 'bg-transparent text-gray-300 border-gray-700 hover:bg-gray-800 hover:text-white'}`}
                                title="Customize Columns"
                            >
                                <FiSettings size={15} />
                                Columns
                            </button>
                            {isSettingsOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 p-3 z-50 animate-fade-in text-gray-900">
                                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-2 border-b pb-1">Visible Columns</h4>
                                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                        {[
                                            { key: 'slNo', label: 'Sl No.' },
                                            { key: 'product', label: 'Product' },
                                            { key: 'qty', label: 'No' },
                                            { key: 'batchNo', label: 'Batch No.' },
                                            { key: 'expDate', label: 'Exp. Date' },
                                            { key: 'sellingRate', label: 'Selling Rate' },
                                            ...(invoice?.type !== 'Wholesale' ? [{ key: 'disc', label: 'Disc %' }] : []),
                                            { key: 'mrp', label: 'MRP' },
                                            { key: 'gst', label: 'GST %' },
                                            { key: 'total', label: 'Total' }
                                        ].map(col => (
                                            <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns[col.key]}
                                                    onChange={() => toggleColumn(col.key)}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="font-medium text-gray-700">{col.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors"
                            title="Close"
                        >
                            <FiX size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Invoice Sheet */}
                <div className="overflow-y-auto p-6 flex-1 bg-gray-100">
                    <div id="pharma-invoice-print-area" className="bg-white mx-auto border-2 border-black text-black font-sans text-xs shadow-lg max-w-[900px]">
                        
                        {/* 1. Header Grid */}
                        <div className="grid grid-cols-12 border-b-2 border-black">
                            
                            {/* Left Box: Seller */}
                            <div className="col-span-5 border-r-2 border-black p-2.5 space-y-1">
                                <div className="font-extrabold text-base uppercase tracking-tight text-black">COMPANY NAME</div>
                                <div className="font-bold text-[10px] uppercase text-gray-800">(A UNIT OF EMMARLINK DISTRIBUTORS PVT.LTD.)</div>
                                <div className="text-[11px] leading-tight text-gray-900 pt-0.5">
                                    82/5201, KARTHIKA<br />
                                    AMBUJAVILASAM ROAD, TRIVANDRUM - 695001
                                </div>
                                <div className="text-[11px] pt-1"><b>Mobile :</b> 04714066607 / 09,8139827221</div>
                                <div className="text-[11px]"><b>FSSAI.No :</b> 11325001000553</div>
                                <div className="text-[11px]"><b>GSTIN :</b> 32AAGCE9732J8ZA</div>
                                <div className="text-[11px] leading-tight"><b>DL No. :</b> WLF20B2025KL001291, WLF21B2025KL001276</div>
                                <div className="text-[11px]"><b>Mail id :</b> br_oxigen@yahoo.com</div>
                            </div>

                            {/* Middle Box: Invoice Info */}
                            <div className="col-span-3 border-r-2 border-black p-2.5 flex flex-col justify-between">
                                <div>
                                    <div className="text-center font-black text-sm underline uppercase tracking-wide">TAX INVOICE</div>
                                    <div className="space-y-1 text-[11px] mt-2">
                                        <div><b>Tax Inv. No. :</b> {invoiceNo}</div>
                                        <div><b>Inv. Date :</b> {formattedInvDate}</div>
                                        <div><b>Inv. Time :</b> {formattedInvTime}</div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="bg-black text-white font-bold px-2.5 py-0.5 text-xs tracking-wider uppercase inline-block border border-black">
                                        {paymentMethod}
                                    </span>
                                </div>
                            </div>

                            {/* Right Box: Buyer / Customer */}
                            <div className="col-span-4 p-2.5 space-y-1 text-[11px] flex flex-col justify-between">
                                <div>
                                    <div className="font-extrabold text-xs uppercase leading-tight text-black">{partyName}</div>
                                    {/* Billing Address */}
                                    <div className="pt-0.5">
                                        <span className="font-bold text-[10px] text-gray-600 uppercase tracking-wide">
                                            {isWholesale ? 'Bill To: ' : ''}
                                        </span>
                                        <span className="leading-tight uppercase text-gray-800">{partyBillingAddress}</span>
                                    </div>
                                    {/* Shipping Address — only shown for wholesale when different */}
                                    {showShipping && (
                                        <div className="pt-0.5 border-t border-dashed border-gray-300 mt-1">
                                            <span className="font-bold text-[10px] text-gray-600 uppercase tracking-wide">Ship To: </span>
                                            <span className="leading-tight uppercase text-gray-800">{partyShippingAddress}</span>
                                        </div>
                                    )}
                                    <div className="pt-1"><b>Ph.:</b> {partyContact}</div>
                                    <div><b>D.L.No.:</b> {partyDl}</div>
                                    <div><b>GSTIN:</b> {partyGstin || 'N/A'}</div>
                                    <div><b>PAN :</b> {partyPan || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Items Table */}
                        <div className="w-full overflow-x-auto border-b-2 border-black">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-black text-[10px] font-extrabold uppercase tracking-tight text-black">
                                        {visibleColumns.slNo && <th className="border-r border-black py-1 px-1 text-center w-8">SL.</th>}
                                        {visibleColumns.product && <th className="border-r border-black py-1 px-1.5 w-48">PRODUCT</th>}
                                        {visibleColumns.qty && <th className="border-r border-black py-1 px-1 text-center w-10">NO</th>}
                                        {visibleColumns.batchNo && <th className="border-r border-black py-1 px-1 text-center w-16">BATCH NO.</th>}
                                        {visibleColumns.expDate && <th className="border-r border-black py-1 px-1 text-center w-12">EXP. DATE</th>}
                                        {visibleColumns.sellingRate && <th className="border-r border-black py-1 px-1 text-right w-16">SELLING RATE</th>}
                                        {visibleColumns.disc && <th className="border-r border-black py-1 px-1 text-right w-14">{isWholesale ? 'MARGIN %' : 'DISC %'}</th>}
                                        {visibleColumns.mrp && <th className="border-r border-black py-1 px-1 text-right w-14">MRP</th>}
                                        {visibleColumns.gst && <th className="border-r border-black py-1 px-1 text-center w-10">GST %</th>}
                                        {visibleColumns.total && <th className="py-1 px-2 text-right w-20">TOTAL</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 text-[10px]">
                                    {items.map((item, index) => (
                                        <tr key={item.id || index} className="hover:bg-gray-50/80 transition-colors">
                                            {visibleColumns.slNo && <td className="border-r border-black py-1 px-1 text-center font-bold">{index + 1}</td>}
                                            {visibleColumns.product && (
                                                <td className="border-r border-black py-1 px-1.5 font-bold uppercase text-black">
                                                    {item.description}
                                                </td>
                                            )}
                                            {visibleColumns.qty && <td className="border-r border-black py-1 px-1 text-center font-bold">{item.qty}</td>}
                                            {visibleColumns.batchNo && <td className="border-r border-black py-1 px-1 text-center uppercase font-mono text-[9px]">{item.batch}</td>}
                                            {visibleColumns.expDate && <td className="border-r border-black py-1 px-1 text-center font-mono text-[9px]">{item.expiry}</td>}
                                            {visibleColumns.sellingRate && <td className="border-r border-black py-1 px-1 text-right font-mono">{Number(item.tradePrice).toFixed(2)}</td>}
                                            {visibleColumns.disc && <td className="border-r border-black py-1 px-1 text-right font-mono">{Number(item.marginPercent || item.disPercent || 0).toFixed(2)}</td>}
                                            {visibleColumns.mrp && <td className="border-r border-black py-1 px-1 text-right font-mono">{Number(item.mrp).toFixed(2)}</td>}
                                            {visibleColumns.gst && <td className="border-r border-black py-1 px-1 text-center font-bold">{item.gstPercent}</td>}
                                            {visibleColumns.total && <td className="py-1 px-2 text-right font-bold font-mono">{Number(item.value).toFixed(2)}</td>}
                                        </tr>
                                    ))}
                                    {/* Empty padding rows to maintain invoice height */}
                                    {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-6">
                                            {visibleColumns.slNo && <td className="border-r border-black"></td>}
                                            {visibleColumns.product && <td className="border-r border-black"></td>}
                                            {visibleColumns.qty && <td className="border-r border-black"></td>}
                                            {visibleColumns.batchNo && <td className="border-r border-black"></td>}
                                            {visibleColumns.expDate && <td className="border-r border-black"></td>}
                                            {visibleColumns.sellingRate && <td className="border-r border-black"></td>}
                                            {visibleColumns.disc && <td className="border-r border-black"></td>}
                                            {visibleColumns.mrp && <td className="border-r border-black"></td>}
                                            {visibleColumns.gst && <td className="border-r border-black"></td>}
                                            {visibleColumns.total && <td></td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 3. Note Banner */}
                        <div className="bg-gray-800 text-white font-bold text-[10px] px-2 py-1 uppercase tracking-tight border-b-2 border-black">
                            NOTE:- NEW- LUPIN, ARISTO, J.B CHEMICALS, LIVIDUS, LIVINOR, P&G, H&H, SUN PHARMA, DR.REDDYS, USV, INTAS, ALKEM, FOURRTS INDIA
                        </div>

                        {/* 4. Calculation Grid */}
                        <div className="grid grid-cols-12 border-b-2 border-black text-[11px]">
                            
                            {/* Col 1: Prep & Route */}
                            <div className="col-span-2 border-r-2 border-black p-1.5 space-y-0.5">
                                <div><b>Prep By :</b> ABILASH</div>
                                <div><b>No of Cs. :</b> 1</div>
                                <div><b>Sort By :</b> NAME</div>
                                <div><b>Checked By:</b> </div>
                                <div><b>Route :</b> DIRECT</div>
                                <div><b>Print Time:</b> {formattedPrintTime}</div>
                                <div className="pt-1"><b>IRN No.</b></div>
                            </div>

                            {/* Col 2: Totals summary */}
                            <div className="col-span-2 border-r-2 border-black p-1.5 space-y-0.5">
                                <div><b>Total Items :</b> {items.length}</div>
                                <div><b>Total No :</b> {totalQty}</div>
                                <div><b>SchDiscGiven:</b> 0.00</div>
                                <div><b>Sale Value :</b> {safeNum(currentInv.itemSubtotal, itemSubtotal).toFixed(2)}</div>
                                <div><b>Cash Disc :</b> {safeNum(currentInv.discountAmount).toFixed(2)}</div>
                                <div><b>Total GST :</b> {totalInvoiceGst.toFixed(2)}</div>
                            </div>

                            {/* Col 3: GST Tax Breakdown Table */}
                            <div className="col-span-5 border-r-2 border-black p-1 text-[10px]">
                                <table className="w-full text-center border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-400 font-bold">
                                            <th className="py-0.5">GST%</th>
                                            <th className="py-0.5">Taxable Amt.</th>
                                            <th className="py-0.5">CGST Amt</th>
                                            <th className="py-0.5">SGST Amt</th>
                                            <th className="py-0.5">IGST Amt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 font-mono text-[9px]">
                                        {[...new Set([28, 18, 12, 5, ...items.map(i => parseGstPercent(i.gstPercent)).filter(r => r > 0)])].map(rate => {
                                            const matchingItems = items.filter(i => parseGstPercent(i.gstPercent) === rate);
                                            const itemValSum = matchingItems.reduce((acc, i) => acc + safeNum(i.value), 0);
                                            const itemTaxable = rate > 0 ? (itemValSum / (1 + rate / 100)) : itemValSum;
                                            const itemTax = itemValSum - itemTaxable;

                                            const matchingAddlCharges = addlChargesList.filter(c => Number(c.gstRate) === rate);
                                            const addlValSum = matchingAddlCharges.reduce((acc, c) => acc + c.amount, 0);
                                            const addlTaxable = rate > 0 ? (addlValSum / (1 + rate / 100)) : addlValSum;
                                            const addlTax = addlValSum - addlTaxable;

                                            const rowTaxable = itemTaxable + addlTaxable;
                                            const rowTax = itemTax + addlTax;

                                            if (rowTaxable === 0 && rowTax === 0) return null;

                                            return (
                                                <tr key={rate} className="bg-gray-50 font-bold">
                                                    <td className="font-sans font-bold">{rate}%</td>
                                                    <td>{rowTaxable.toFixed(2)}</td>
                                                    <td>{(rowTax / 2).toFixed(2)}</td>
                                                    <td>{(rowTax / 2).toFixed(2)}</td>
                                                    <td>0.00</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-black font-bold font-mono">
                                            <td className="font-sans">Total</td>
                                            <td>{totalInvoiceTaxable.toFixed(2)}</td>
                                            <td>{(totalInvoiceGst / 2).toFixed(2)}</td>
                                            <td>{(totalInvoiceGst / 2).toFixed(2)}</td>
                                            <td>0.00</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Col 4: Final Financials & Sign */}
                            <div className="col-span-3 flex flex-col justify-between text-[11px]">
                                <div className="p-1.5 space-y-0.5 font-mono">
                                    <div className="flex justify-between font-sans"><span>Gross Amt</span><span className="font-mono font-bold">{safeNum(currentInv.itemSubtotal, itemSubtotal).toFixed(2)}</span></div>
                                    <div className="flex justify-between font-sans"><span>Dis Amt</span><span>{safeNum(currentInv.discountAmount).toFixed(2)}</span></div>
                                    {addlChargesList.length > 0 ? (
                                        addlChargesList.map((chg, cIdx) => (
                                            <div key={cIdx} className="flex justify-between font-sans">
                                                <span className="truncate pr-1 font-semibold">{chg.name || 'Addl Chg'}</span>
                                                <span>{safeNum(chg.amount).toFixed(2)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex justify-between font-sans">
                                            <span>Addl Chg</span>
                                            <span>{safeNum(currentInv.additionalChargesAmount).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-sans"><span>GST Amt</span><span className="font-mono">{totalInvoiceGst.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-sans"><span>Cr No.</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans"><span>Db No.</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans"><span>TCS% 0.000</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans"><span>R.off</span><span>{safeNum(currentInv.roundOffAmount).toFixed(2)}</span></div>
                                </div>
                                <div className="bg-gray-900 text-white font-black text-sm px-2.5 py-1.5 flex justify-between items-center tracking-wide">
                                    <span>Grand Total</span>
                                    <span className="font-mono">{grandTotal.toFixed(2)}</span>
                                </div>
                                <div className="p-1.5 text-[10px] space-y-0.5">
                                    <div><b>Ewb No. :</b></div>
                                    <div><b>Ewb DT. :</b></div>
                                    <div className="mt-4 text-right pt-2 border-t border-gray-200">
                                        <b>For : B.R ASSOCIATES</b><br/>
                                        <span className="text-[8px] text-gray-700">(A UNIT OF EMMARLINK DISTRIBUTORS PVT.LTD.)</span>
                                        <div className="h-6"></div>
                                        <b className="border-t border-black px-2 pt-0.5 inline-block">Authorised Signatory</b>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 5. Bottom Footer Grid */}
                        <div className="grid grid-cols-12 text-[10px] bg-gray-50/50">
                            
                            {/* Declaration */}
                            <div className="col-span-5 border-r-2 border-black p-2 space-y-1">
                                <div className="font-bold underline text-black">Declaration</div>
                                <p className="text-[9px] leading-relaxed text-gray-800">
                                    We Hereby warranty that the medicine purchased under this invoice do not contravene in any way the provision of section.18 of the Drugs & Cosmetics Act 1940.
                                </p>
                                <p className="text-[9px] leading-relaxed text-gray-800">
                                    For the purpose of Jurisdiction the cause of action for this transaction shall be deemed to have been made in Kannur and it is agreed by and between parties hereto that Courts in Kannur will have exclusive Jurisdiction E.&.O.E
                                </p>
                            </div>

                            {/* QR Code */}
                            <div className="col-span-3 border-r-2 border-black p-2 flex flex-col items-center justify-center">
                                <div className="w-24 h-24 border-2 border-black p-1.5 bg-white flex flex-col items-center justify-center text-center shadow-inner">
                                    <div className="w-full h-full border border-dashed border-gray-800 grid grid-cols-4 grid-rows-4 gap-0.5 p-1">
                                        <div className="bg-black col-span-2 row-span-2"></div>
                                        <div className="bg-black col-span-1"></div>
                                        <div className="bg-black row-span-1 col-span-1"></div>
                                        <div className="bg-black col-span-1 row-span-2"></div>
                                        <div className="bg-black col-span-2 row-span-1"></div>
                                        <div className="bg-black col-span-1"></div>
                                        <div className="bg-black col-span-2 row-span-1"></div>
                                    </div>
                                    <span className="text-[7px] font-mono mt-0.5 text-gray-600 font-bold">UPI / IRN QR</span>
                                </div>
                            </div>

                            {/* Bank Details */}
                            <div className="col-span-4 p-2 space-y-1 font-mono text-[11px]">
                                <div className="font-bold underline font-sans text-black">BANK DETAILS</div>
                                <div><b className="font-sans">BANK     :</b> HDFC BANK</div>
                                <div><b className="font-sans">BANK A/C :</b> 57500001846910</div>
                                <div><b className="font-sans">BRANCH   :</b> MG ROAD</div>
                                <div><b className="font-sans">IFSC     :</b> HDFC0001496</div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
