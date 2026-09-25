import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiPrinter, FiDownload, FiSettings } from 'react-icons/fi';

export default function InvoiceTemplateModal({ isOpen, onClose, business, template }) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef(null);

    let cols = [];
    if (template?.columns) {
        let rawCols = [];
        if (typeof template.columns === "string") {
            try {
                let parsed = JSON.parse(template.columns);
                if (typeof parsed === "string") parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) rawCols = parsed;
            } catch(e) {
                if (template.columns.includes(",")) rawCols = template.columns.split(",").map(s => s.trim()).filter(Boolean);
                else if (template.columns.trim() && !template.columns.startsWith("[")) rawCols = [template.columns.trim()];
            }
        } else if (Array.isArray(template.columns)) {
            rawCols = template.columns;
        }
        rawCols.forEach(c => {
            if (typeof c === "object" && c !== null) {
                if (c.name) cols.push(c.name);
            } else if (typeof c === "string") {
                cols.push(c);
            }
        });
    }
    if (!Array.isArray(cols)) cols = [];
        
    const defaultCols = ["Product Name", "Qty", "Selling Rate", "Discount", "MRP", "GST", "Total"];
        
    const defaultColsUpper = defaultCols.map(c => c.toUpperCase());
    if (template && template.isProductBased === false) {
        cols = cols.filter(c => !defaultColsUpper.includes(c.toUpperCase()));
    } else {
        // Ensure default columns are present for product-based templates
        const extraCols = cols.filter(c => !defaultColsUpper.includes(c.toUpperCase()));
        cols = [...defaultCols, ...extraCols];
    }

    const today = new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const formattedInvTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const isWholesale = template?.isProductBased; 

    // visible columns state for the settings dropdown
    const initialCols = {
        slNo: true
    };
    cols.forEach(c => initialCols[c] = true);
    
    const [visibleColumns, setVisibleColumns] = useState(initialCols);

    useEffect(() => {
        // Reset columns if business changes
        const newCols = { slNo: true };
        cols.forEach(c => newCols[c] = true);
        setVisibleColumns(newCols);
    }, [template]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (settingsRef.current && !settingsRef.current.contains(event.target)) {
                setIsSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleColumn = (key) => {
        setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isOpen || !business) return null;

    const handlePrint = () => {
        window.print();
    };

    // Dummy items
    const items = [
        { id: 1, description: 'SAMPLE PRODUCT 1', qty: 10, batch: 'B001', expiry: '12/25', tradePrice: 100, marginPercent: 10, mrp: 120, gstPercent: 12, value: 1000 },
        { id: 2, description: 'SAMPLE PRODUCT 2', qty: 5, batch: 'B002', expiry: '11/24', tradePrice: 200, marginPercent: 5, mrp: 250, gstPercent: 5, value: 1000 }
    ];

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #business-invoice-print-area, #business-invoice-print-area * {
                        visibility: visible !important;
                    }
                    #business-invoice-print-area {
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
                        <span className="px-2.5 py-0.5 bg-indigo-600 text-xs font-bold rounded uppercase tracking-wider">Tax Invoice </span>
                        <h3 className="text-base font-semibold">{template?.name || business.name} Format</h3>
                    </div>
                    <div className="flex items-center gap-3">

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
                    <div id="business-invoice-print-area" className="bg-white mx-auto border-2 border-black text-black font-sans text-xs shadow-lg max-w-[900px]">
                        
                        {/* 1. Header Grid */}
                        <div className="grid grid-cols-12 border-b-2 border-black">
                            
                            {/* Left Box: Seller */}
                            <div className="col-span-5 border-r-2 border-black p-2.5 space-y-1.5">
                                    <div className="flex items-center gap-2 mb-2">
                                        {business.logo && <img src={business.logo} alt="Logo" className="h-12 object-contain" />}
                                        <span className="font-extrabold text-lg">{business.name}</span>
                                        {template?.isB2B && (
                                            <span className="border border-black px-1.5 py-0.5 text-[15px] font-bold tracking-wide ">B 2 B</span>
                                        )}
                                    </div>
                                <div className="space-y-1 mt-1">
                                    {(() => {
                                        if (!business.additionalData) return null;
                                        let dataArray = business.additionalData;
                                        if (typeof dataArray === 'string') {
                                            try { dataArray = JSON.parse(dataArray); } catch(e) { return null; }
                                        }
                                        if (!Array.isArray(dataArray)) return null;

                                        return dataArray.map((item, idx) => {
                                            const value = typeof item === 'object' && item !== null ? (item.value || item.key || "") : item;
                                            if (!value) return null;
                                            return (
                                                <div key={idx} className="text-[11px] leading-tight">
                                                    {value}
                                                </div>
                                            );
                                        });
                                    })()}
                                    {(!business.additionalData || business.additionalData.length === 0) && (
                                        <>
                                            <div className="text-[11px] leading-tight text-gray-900 pt-0.5">SH1, Kilimanoor, Thiruvananthapuram, Kerala - 695601</div>
                                            <div className="text-[11px] pt-1"><b>Email ID :</b> rxpharma27@gmail.com</div>
                                            <div className="text-[11px]"><b>GST No :</b> 32ACAFM5688A1ZH</div>
                                            <div className="text-[11px] leading-tight pt-0.5">
                                                <b>DL No :</b> RLF20KL2026002461 , RLF21KL2026002472
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Middle Box: Invoice Info */}
                            <div className="col-span-3 border-r-2 border-black p-2.5 flex flex-col justify-between">
                                <div>
                                    <div className="text-center font-black text-sm underline uppercase tracking-wide">TAX INVOICE </div>
                                    <div className="space-y-1 text-[11px] mt-2">
                                        <div><b>Tax Inv. No. :</b> INV-2026-001</div>
                                        <div><b>Inv. Date :</b> {today}</div>
                                        <div><b>Inv. Time :</b> {formattedInvTime}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Box: Buyer / Customer */}
                            <div className="col-span-4 p-2.5 space-y-1 text-[11px] flex flex-col justify-between">
                                <div className="space-y-1.5">
                                    <div className="font-extrabold text-xs uppercase leading-tight text-black">
                                        SAMPLE CUSTOMER
                                    </div>
                                    <div className="text-gray-800 leading-tight"><b>Phone : </b><span>9876543210</span></div>
                                    <div className="leading-tight uppercase text-gray-800">123 SAMPLE ADDRESS, CITY, ST 12345</div>
                                    {!isWholesale && <div className="text-gray-800">AGE 30</div>}
                                    {isWholesale && (
                                        <>
                                            <div className="text-gray-800">SAMPLE-DL-123</div>
                                            <div className="text-gray-800">SAMPLE-GST-123</div>
                                        </>
                                    )}
                                    <div className="text-gray-800">DATA 1</div>
                                    <div className="text-gray-800">DATA 2</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Items Table */}
                        <div className="w-full overflow-x-auto border-b-2 border-black">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-black text-[10px] font-extrabold uppercase tracking-tight text-black">
                                        {visibleColumns.slNo && <th className="border-r border-black py-1 px-1 text-center w-8">SL.</th>}
                                        {cols.map(col => (
                                            visibleColumns[col] && <th key={col} className="border-r border-black py-1 px-1 text-center">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 text-[10px]">
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                            {visibleColumns.slNo && <td className="border-r border-black py-1 px-1 text-center font-bold">{index + 1}</td>}
                                            {cols.map(col => (
                                                visibleColumns[col] && <td key={col} className="border-r border-black py-1 px-1 text-center font-mono">
                                                    [Sample {col}]
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {/* Empty padding rows to maintain invoice height */}
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={`empty-${i}`} className="h-6">
                                            {visibleColumns.slNo && <td className="border-r border-black"></td>}
                                            {cols.map(col => (
                                                visibleColumns[col] && <td key={col} className="border-r border-black"></td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>


                        {/* 4. Calculation Grid */}
                        <div className="grid grid-cols-12 border-b-2 border-black text-[11px]">
                            
                            {/* Col 1: Totals summary */}
                            <div className="col-span-3 border-r-2 border-black p-1.5 space-y-0.5">
                                <div><b>Total Items :</b> {items.length}</div>
                                <div><b>Total No :</b> 15</div>
                            </div>

                            {/* Col 2: Empty Spacer */}
                            <div className="col-span-4 border-r-2 border-black p-1">
                            </div>

                            {/* Col 4: Final Financials & Sign */}
                            <div className="col-span-5 flex flex-col justify-between text-[11px]">
                                <div className="p-1.5 space-y-0.5 font-mono">
                                    <div className="flex justify-between font-sans"><span>Gross Amt</span><span className="font-mono font-bold">2000.00</span></div>
                                    <div className="flex justify-between font-sans"><span>Dis Amt</span><span>0.00</span></div>
                                    <div className="flex justify-between font-sans">
                                        <span>Addl Chg</span>
                                        <span>0.00</span>
                                    </div>
                                    <div className="flex justify-between font-sans"><span>GST Amt</span><span className="font-mono">170.00</span></div>
                                    <div className="flex justify-between font-sans"><span>R.off</span><span>0.00</span></div>
                                </div>
                                <div className="bg-white text-black border-y-2 border-black font-black text-sm px-2.5 py-1.5 flex justify-between items-center tracking-wide">
                                    <span className="whitespace-nowrap">Grand Total</span>
                                    <span className="font-mono">2170.00</span>
                                </div>
                                <div className="p-1.5 text-[10px] space-y-0.5">
                                    <div className="text-right">
                                        <b>For : {business.name}</b><br/>
                                        {template?.signatureImage ? (
                                            <div className="flex justify-end py-1">
                                                <img src={template.signatureImage} alt="Signature" className="h-10 max-w-[120px] object-contain" />
                                            </div>
                                        ) : (
                                            <div className="h-6"></div>
                                        )}
                                        <b className="border-t border-black px-2 pt-0.5 inline-block">Authorised Signatory</b>
                                    </div>
                                </div>
                            </div>
                        </div>



                    </div>
                </div>
            </div>
        </div>
    );
}

