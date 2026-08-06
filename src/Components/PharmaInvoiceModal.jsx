import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiPrinter, FiDownload, FiCheckCircle, FiSettings } from 'react-icons/fi';

export default function PharmaInvoiceModal({ isOpen, onClose, invoice }) {
    if (!isOpen || !invoice) return null;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef(null);

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
        const saved = localStorage.getItem('invoice_visible_columns');
        if (saved) {
            try {
                setVisibleColumns(JSON.parse(saved));
            } catch (e) { }
        }
    }, []);

    const toggleColumn = (key) => {
        const updated = { ...visibleColumns, [key]: !visibleColumns[key] };
        setVisibleColumns(updated);
        localStorage.setItem('invoice_visible_columns', JSON.stringify(updated));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Extract or fallback invoice fields
    const invoiceNo = invoice.invoiceNo || invoice.id || 'BR-26-1025';
    const date = invoice.date || invoice.invoiceDate || '10/04/2026';
    const paymentMethod = invoice.paymentMethod || 'CREDIT';
    
    // Extract customer / party details
    const partyName = invoice.partyName || (invoice.party && invoice.party.name) || 'DR.BASHEER MBBS / SHIFA CLINIC';
    const partyAddress = (invoice.party && invoice.party.address) || 'KILIMINOOR, THIRUVANANTHAPURAM - 695601';
    const partyContact = (invoice.party && invoice.party.contact) || '9447411778 / 9946973266';
    const partyCode = (invoice.party && invoice.party.id) ? `Code A30${invoice.party.id}` : 'Code A373';
    const partyDl = (invoice.party && invoice.party.dlNo) || 'REG NO-16475';
    const partyGstin = (invoice.party && invoice.party.gstin) || '';
    const partyPan = (invoice.party && invoice.party.pan) || '';

    // Extract line items or fallback to mock pharma items if summary row
    let rawItems = invoice.items && invoice.items.length > 0 ? invoice.items : [
        { id: 1, description: 'INSUTREND 30/70 REFILL', qty: 10, price: 284.00, batch: 'A042517682', expiry: '11/28', mrp: 355.00, scheme: '+3', hsn: '30043110', gst: 5, mkt: 'ANTHE', rack: 'A1' },
        { id: 2, description: 'INSUTREND 50/50 REFILL', qty: 10, price: 260.00, batch: 'A042517622', expiry: '08/28', mrp: 325.00, scheme: '+3', hsn: '30043110', gst: 5, mkt: 'ANTHE', rack: 'A2' }
    ];

    // Normalize items with pharma defaults
    const items = rawItems.map((item, idx) => {
        const price = Number(item.price) || 100;
        const qty = Number(item.qty) || 1;
        return {
            id: item.id || idx + 1,
            rack: item.rack || `R-${idx + 1}`,
            mkt: item.mkt || 'ANTHE',
            description: item.description || item.name || 'MEDICINE PRODUCT',
            pack: item.pack || '1',
            qty: qty,
            scheme: item.scheme || '+0',
            batch: item.batch || `B${202600 + idx}`,
            expiry: item.expiry || '08/28',
            mrp: item.mrp || (price * 1.25),
            tradePrice: price,
            scmPercent: item.scmPercent || 0,
            disPercent: item.disPercent || 0,
            gstPercent: item.gst || item.gstPercent || 5,
            hsnCode: item.hsn || item.hsnCode || '30043110',
            value: qty * price
        };
    });

    const safeNum = (val, fallback = 0) => {
        const n = Number(val);
        return isNaN(n) ? fallback : n;
    };

    const totalQty = items.reduce((acc, item) => acc + safeNum(item.qty), 0);
    const itemSubtotal = safeNum(invoice.itemSubtotal ?? items.reduce((acc, item) => acc + safeNum(item.value), 0));
    const gstRate = safeNum(invoice.gstRate ?? 5);
    const taxAmount = safeNum(invoice.taxAmount ?? (itemSubtotal * (gstRate / 100)));
    const taxableSubtotal = safeNum(invoice.subtotal ?? Math.max(0, itemSubtotal - taxAmount));
    const grandTotal = safeNum(invoice.grandTotal ?? (taxableSubtotal + taxAmount));

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
                                        <div><b>Inv. Date :</b> {date}</div>
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
                                    <div className="bg-black text-white px-2 py-0.5 inline-block font-bold text-[10px] mb-1">
                                        {partyCode}
                                    </div>
                                    <div className="font-extrabold text-xs uppercase leading-tight text-black">{partyName}</div>
                                    <div className="leading-tight uppercase text-gray-800 pt-0.5">{partyAddress}</div>
                                    <div className="pt-1"><b>Ph.:</b> {partyContact}</div>
                                    <div><b>D.L.No.:</b> {partyDl}</div>
                                    <div><b>GSTIN:</b> {partyGstin || 'N/A'}</div>
                                    <div><b>PAN :</b> {partyPan || 'N/A'}</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Items Table */}
                        <div className="w-full overflow-x-auto border-b-2 border-black">
                            <table className="w-full border-collapse text-[11px]">
                                <thead>
                                    <tr className="border-b-2 border-black bg-gray-50 font-bold text-black uppercase text-[10px]">
                                        {visibleColumns.slNo && <th className="border-r border-black py-1.5 px-1 text-center w-10">Sl<br/>No.</th>}
                                        {visibleColumns.product && <th className="border-r border-black py-1.5 px-2 text-left">PRODUCT</th>}
                                        {visibleColumns.qty && <th className="border-r border-black py-1.5 px-1 text-right w-12">No</th>}
                                        {visibleColumns.batchNo && <th className="border-r border-black py-1.5 px-1 text-center w-20">BATCH<br/>No.</th>}
                                        {visibleColumns.expDate && <th className="border-r border-black py-1.5 px-1 text-center w-16">EXP.<br/>Date</th>}
                                        {visibleColumns.sellingRate && <th className="border-r border-black py-1.5 px-1 text-right w-16">Selling<br/>Rate</th>}
                                        {visibleColumns.disc && invoice?.type !== 'Wholesale' && <th className="border-r border-black py-1.5 px-1 text-right w-12">Disc<br/>%</th>}
                                        {visibleColumns.mrp && <th className="border-r border-black py-1.5 px-1 text-right w-16">MRP</th>}
                                        {visibleColumns.gst && <th className="border-r border-black py-1.5 px-1 text-center w-12">GST<br/>%</th>}
                                        {visibleColumns.total && <th className="py-1.5 px-2 text-right w-20">TOTAL</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 font-medium text-black">
                                    {items.map((item, idx) => (
                                        <tr key={item.id || idx} className="hover:bg-gray-50/50">
                                            {visibleColumns.slNo && <td className="border-r border-black py-1 px-1 text-center font-mono text-[10px]">{idx + 1}</td>}
                                            {visibleColumns.product && <td className="border-r border-black py-1 px-2 font-bold text-left">{item.description}</td>}
                                            {visibleColumns.qty && <td className="border-r border-black py-1 px-1 text-right font-bold">{item.qty}</td>}
                                            {visibleColumns.batchNo && <td className="border-r border-black py-1 px-1 text-center font-mono text-[10px]">{item.batch}</td>}
                                            {visibleColumns.expDate && <td className="border-r border-black py-1 px-1 text-center font-mono text-[10px]">{item.expiry}</td>}
                                            {visibleColumns.sellingRate && <td className="border-r border-black py-1 px-1 text-right font-mono">{Number(item.tradePrice).toFixed(2)}</td>}
                                            {visibleColumns.disc && invoice?.type !== 'Wholesale' && <td className="border-r border-black py-1 px-1 text-right">{item.disPercent || '0.00'}</td>}
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
                                            {visibleColumns.disc && invoice?.type !== 'Wholesale' && <td className="border-r border-black"></td>}
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
                                <div><b>Print Time:</b> 05:22Pm</div>
                                <div className="pt-1"><b>IRN No.</b></div>
                            </div>

                            {/* Col 2: Totals summary */}
                            <div className="col-span-2 border-r-2 border-black p-1.5 space-y-0.5">
                                <div><b>Total Items :</b> {items.length}</div>
                                <div><b>Total No :</b> {totalQty}</div>
                                <div><b>SchDiscGiven:</b> 0.00</div>
                                <div><b>Sale Value :</b> {itemSubtotal.toFixed(2)}</div>
                                <div><b>Cash Disc :</b> 0.00</div>
                                <div><b>Total GST :</b> {taxAmount.toFixed(2)}</div>
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
                                        {[18, 5].map(rate => {
                                            const isMatch = Number(gstRate) === rate;
                                            const rowTaxable = isMatch ? taxableSubtotal : 0;
                                            const rowTax = isMatch ? taxAmount : 0;
                                            return (
                                                <tr key={rate} className={isMatch ? "bg-gray-50 font-bold" : ""}>
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
                                            <td>{taxableSubtotal.toFixed(2)}</td>
                                            <td>{(taxAmount / 2).toFixed(2)}</td>
                                            <td>{(taxAmount / 2).toFixed(2)}</td>
                                            <td>0.00</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Col 4: Final Financials & Sign */}
                            <div className="col-span-3 flex flex-col justify-between text-[11px]">
                                <div className="p-1.5 space-y-0.5 font-mono">
                                    <div className="flex justify-between font-sans"><span>Gross Amt</span><span className="font-mono font-bold">{itemSubtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-sans"><span>Dis Amt</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans"><span>Scm Amt</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans"><span>GST Amt</span><span className="font-mono">{taxAmount.toFixed(2)}</span></div>
                                    <div className="flex justify-between font-sans"><span>Cr No.</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans"><span>Db No.</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans"><span>TCS% 0.000</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans"><span>R.off</span><span>0.00</span></div>
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
