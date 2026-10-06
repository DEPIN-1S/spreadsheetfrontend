import React, { useRef } from 'react';
import { FiX, FiPrinter, FiEdit2 } from 'react-icons/fi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { parseGstPercent } from '../utils/gst';

export default function ViewSavedInvoiceModal({ isOpen, onClose, savedInvoice, currentBusiness, onEdit }) {
    const printAreaRef = useRef(null);

    if (!isOpen || !savedInvoice || !savedInvoice.fullData) return null;

    let parsedData = savedInvoice.fullData;
    if (typeof parsedData === 'string') {
        try { parsedData = JSON.parse(parsedData); } catch (e) { }
    }
    const { items, totals, template, party, date } = parsedData || {};
    const paymentMethod = parsedData?.paymentMethod || savedInvoice?.paymentMethod || 'Cash';
    const combinedUpiAmount = parsedData?.combinedUpiAmount || savedInvoice?.combinedUpiAmount || 0;
    const combinedCashAmount = parsedData?.combinedCashAmount || savedInvoice?.combinedCashAmount || 0;
    let business = parsedData?.business || {};
    let selectedSeals = parsedData?.selectedSeals || [];

    // Hydrate stripped heavy base64 assets from the active currentBusiness context
    if (currentBusiness) {
        if (!business.logo) business.logo = currentBusiness.logo;
        if (!business.seal) business.seal = currentBusiness.seal;
        if (!business.signatureImage) business.signatureImage = currentBusiness.signatureImage;
        if (!business.signatures) business.signatures = currentBusiness.signatures;
        if (!business.seals) business.seals = currentBusiness.seals;

        let sealsArray = currentBusiness?.seals || business?.seals;
        if (typeof sealsArray === 'string') {
            try { sealsArray = JSON.parse(sealsArray); } catch (e) { sealsArray = []; }
        }
        if (Array.isArray(parsedData?.selectedSealIndices) && parsedData.selectedSealIndices.length > 0 && Array.isArray(sealsArray)) {
            const byIndices = parsedData.selectedSealIndices.map(idx => sealsArray[idx]).filter(Boolean);
            if (byIndices.length > 0) {
                selectedSeals = byIndices;
            }
        } else if (selectedSeals.length === 0 && !parsedData?.hasNoSeal) {
            let fallbackSeal = null;
            if (Array.isArray(sealsArray) && sealsArray.length > 0 && sealsArray[0]) {
                fallbackSeal = sealsArray[0];
            } else if (currentBusiness?.seal || business?.seal) {
                fallbackSeal = currentBusiness?.seal || business?.seal;
            }
            if (fallbackSeal) {
                selectedSeals = [fallbackSeal];
            }
        }
    }
    const { invoiceNo, time } = savedInvoice;
    const isWholesale = template?.isB2B || false;

    // Fallback template variables
    let cols = [];
    let colTypes = {};
    if (template?.columns) {
        let rawCols = [];
        if (typeof template.columns === "string") {
            try {
                let parsed = JSON.parse(template.columns);
                if (typeof parsed === "string") parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) rawCols = parsed;
            } catch {
                if (template.columns.includes(",")) rawCols = template.columns.split(",").map(s => s.trim()).filter(Boolean);
                else if (template.columns.trim() && !template.columns.startsWith("[")) rawCols = [template.columns.trim()];
            }
        } else if (Array.isArray(template.columns)) {
            rawCols = template.columns;
        }
        rawCols.forEach(c => {
            if (typeof c === "object" && c !== null) {
                if (c.name) {
                    cols.push(c.name);
                    if (c.type) colTypes[c.name] = c.type;
                }
            } else if (typeof c === "string") {
                cols.push(c);
            }
        });
    }
    if (!Array.isArray(cols)) cols = [];
    const defaultCols = ["Product Name", "Qty", "Selling Rate", "Discount", "MRP", "GST", "Total"];
    if (cols.length === 0) cols = defaultCols;
    const initialCols = cols.reduce((acc, c) => ({ ...acc, [c]: true }), { slNo: true });
    const visibleColumns = template?.visibleColumns ? (typeof template.visibleColumns === 'string' ? JSON.parse(template.visibleColumns) : template.visibleColumns) : initialCols;
    const templateName = template?.name || 'Standard Invoice';
    const formatDateDMY = (d) => d;

    // Auto-calculate financial numbers from items if not present in totals
    const totalNoCalc = (items || []).reduce((sum, item) => sum + (parseFloat(item.Qty) || 0), 0);
    const totalGrossCalc = (items || []).reduce((sum, item) => {
        const totalVal = parseFloat(item.Total);
        if (!isNaN(totalVal)) return sum + totalVal;
        const qty = parseFloat(item.Qty) || 0;
        const rate = parseFloat(item['Selling Rate']) || parseFloat(item['MRP']) || 0;
        return sum + (qty * rate);
    }, 0);
    const totalGstCalc = (items || []).reduce((sum, item) => {
        const gstPercent = parseGstPercent(item.GST || item['GST%'] || item.gst || item.gstPercent);
        const lineTotal = parseFloat(item.Total) || ((parseFloat(item.Qty) || 0) * (parseFloat(item['Selling Rate']) || parseFloat(item['MRP']) || 0));
        return sum + (gstPercent > 0 ? (lineTotal - (lineTotal / (1 + gstPercent / 100))) : 0);
    }, 0);

    const totalTaxableCalc = totalGrossCalc - totalGstCalc;
    const gstVal = parseFloat(totals?.totalGst !== '' && totals?.totalGst !== undefined ? totals.totalGst : (totalGstCalc > 0 ? totalGstCalc : 0)) || 0;
    const grossVal = parseFloat(totals?.grossAmt !== '' && totals?.grossAmt !== undefined ? totals.grossAmt : (totalGrossCalc - gstVal)) || 0;
    const disVal = parseFloat(totals?.disAmt) || 0;
    const addlVal = parseFloat(totals?.addlChg) || 0;
    const roffVal = parseFloat(totals?.rOff) || 0;

    const computedGrandTotal = (grossVal - disVal + addlVal + gstVal + roffVal).toFixed(2);

    const getGstBreakdown = (itemsList) => {
        const validItems = (itemsList || []).filter(i => (i['Product Name'] && i['Product Name'].trim()) || parseFloat(i.Total) > 0 || parseFloat(i.Qty) > 0);
        const ratesInItems = validItems.map(i => parseGstPercent(i.GST || i['GST%'] || i.gst || i.gstPercent)).filter(r => r > 0);
        const distinctRates = ratesInItems.length > 0 ? [...new Set(ratesInItems)].sort((a, b) => a - b) : [5];

        let totalTaxable = 0;
        let totalTax = 0;

        const rows = distinctRates.map(rate => {
            const matchingItems = validItems.filter(i => parseGstPercent(i.GST || i['GST%'] || i.gst || i.gstPercent) === rate);
            const itemValSum = matchingItems.reduce((acc, i) => {
                const lineTotal = parseFloat(i.Total) || ((parseFloat(i.Qty) || 0) * (parseFloat(i['Selling Rate']) || parseFloat(i['MRP']) || 0));
                return acc + (isNaN(lineTotal) ? 0 : lineTotal);
            }, 0);
            const itemTaxable = rate > 0 ? (itemValSum / (1 + rate / 100)) : itemValSum;
            const itemTax = itemValSum - itemTaxable;

            totalTaxable += itemTaxable;
            totalTax += itemTax;

            return {
                rate: String(rate) + '%',
                taxable: itemTaxable.toFixed(2),
                cgst: (itemTax / 2).toFixed(2),
                sgst: (itemTax / 2).toFixed(2),
                igst: '0.00'
            };
        });

        return {
            rows,
            totalTaxable: totalTaxable.toFixed(2),
            totalCgst: (totalTax / 2).toFixed(2),
            totalSgst: (totalTax / 2).toFixed(2),
            totalIgst: '0.00'
        };
    };

    const gstBreakdown = getGstBreakdown(items);

    const displayGrandTotal = (totals?.manualGrandTotal !== undefined && totals?.manualGrandTotal !== '')
        ? totals.manualGrandTotal
        : (savedInvoice?.total && savedInvoice.total !== '0.00' && savedInvoice.total !== '0')
            ? savedInvoice.total
            : (totals?.grandTotal && totals.grandTotal !== '0.00' && totals.grandTotal !== '0')
                ? totals.grandTotal
                : (grossVal > 0 || disVal > 0 || addlVal > 0 || roffVal !== 0 || gstVal > 0 ? computedGrandTotal : (totalGrossCalc > 0 ? totalGrossCalc.toFixed(2) : '0.00'));

    const displayGrossAmt = (totals?.grossAmt !== '' && totals?.grossAmt !== undefined)
        ? totals.grossAmt
        : (grossVal > 0 ? grossVal.toFixed(2) : (totalGrossCalc > 0 ? totalGrossCalc.toFixed(2) : ''));

    const displayGstAmt = (totals?.totalGst !== '' && totals?.totalGst !== undefined)
        ? totals.totalGst
        : (gstVal > 0 ? gstVal.toFixed(2) : '');

    const displayTotalNo = (totals?.totalNo !== '' && totals?.totalNo !== undefined)
        ? totals.totalNo
        : (totalNoCalc > 0 ? totalNoCalc : '');

    const handlePrint = () => {
        const printContent = printAreaRef.current;
        if (!printContent) {
            window.print();
            return;
        }

        // Sync input values to their value attributes so they print in cloned iframe
        const inputs = printContent.querySelectorAll('input');
        inputs.forEach(input => {
            input.setAttribute('value', input.value || '');
        });

        let iframe = document.getElementById('invoice-print-iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'invoice-print-iframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(s => s.outerHTML)
            .join('\n');

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${invoiceNo || 'Tax Invoice'}</title>
                ${styles}
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 6mm;
                    }
                    * {
                        box-sizing: border-box;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        color: #000 !important;
                        width: 100% !important;
                        height: auto !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #business-invoice-print-area {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 auto !important;
                        border: 2px solid #000 !important;
                        box-shadow: none !important;
                        background: #fff !important;
                    }
                    #business-invoice-print-area table {
                        min-width: 0 !important;
                        width: 100% !important;
                    }
                    #business-invoice-print-area input {
                        border: none !important;
                        background: transparent !important;
                        box-shadow: none !important;
                        color: #000 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                </style>
            </head>
            <body>
                <div id="business-invoice-print-area" class="${printContent.className}">
                    ${printContent.innerHTML}
                </div>
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }, 250);
    };

    const handleDownload = async () => {
        if (!printAreaRef.current) return;
        try {
            const canvas = await html2canvas(printAreaRef.current, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${invoiceNo || 'Invoice'}.pdf`);
        } catch (e) {
            console.error('Error generating PDF', e);
            window.print();
        }
    };

    return (
        <React.Fragment>
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <style>{`
                                        @media print {
                        @page {
                            size: A4 portrait;
                            margin: 6mm;
                        }
                        html, body {
                            width: 100% !important;
                            height: auto !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #fff !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
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
                            max-width: 100% !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            border: 2px solid #000 !important;
                            box-sizing: border-box !important;
                            background: #fff !important;
                        }
                        
                        /* HOLY GRAIL FIX: Shrink the physical layout space of everything EXCEPT the print area */
                        body :not(:has(#business-invoice-print-area)):not(#business-invoice-print-area):not(#business-invoice-print-area *) {
                            display: none !important;
                        }

                        #business-invoice-print-area table {
                            min-width: 0 !important;
                            width: 100% !important;
                        }
                        #business-invoice-print-area input {
                            border: none !important;
                            background: transparent !important;
                            box-shadow: none !important;
                            color: #000 !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}</style>

                <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full overflow-hidden flex flex-col max-h-[95vh]">

                    <div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between no-print border-b border-gray-800">
                        <div className="flex items-center gap-3">
                            <span className="bg-indigo-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Saved Invoice</span>
                            <h2 className="text-lg font-bold truncate max-w-sm">{templateName}</h2>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 mr-2">
                                {onEdit && (
                                    <button
                                        onClick={() => onEdit(savedInvoice)}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                                        title="Edit Invoice"
                                    >
                                        <FiEdit2 size={14} />
                                        Edit Invoice
                                    </button>
                                )}
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow transition-colors"
                                >
                                    Download PDF
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg transition-colors border border-gray-700"
                                >
                                    <FiPrinter />
                                    <span>Print</span>
                                </button>
                            </div>
                            <div className="w-px h-6 bg-gray-700"></div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors p-1"
                            >
                                <FiX size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-100 p-8 relative">
                        <div ref={printAreaRef} id="business-invoice-print-area" className="bg-white mx-auto border-2 border-black text-black font-sans text-xs shadow-lg max-w-[900px]">

                            {/* 1. Header Grid */}
                            <div className="grid grid-cols-12 border-b-2 border-black">

                                {/* Left Box: Seller */}
                                <div className="col-span-5 border-r-2 border-black p-2.5 space-y-1.5">
                                    <div className="flex items-center gap-2 mb-2">
                                        {business?.logo && <img src={business.logo} alt="Logo" className="h-12 object-contain" />}
                                        {template?.showBusinessName !== false && (
                                            <span className="font-extrabold text-lg">{business?.name}</span>
                                        )}
                                        {template?.isB2B && (
                                            <span className="border border-black px-1.5 py-0.5 text-[15px] font-bold tracking-wide ">B 2 B</span>
                                        )}
                                    </div>
                                    <div className="space-y-1 mt-1">
                                        {(({ business: b = business }) => {
                                            if (!b?.additionalData) return null;
                                            let dataArray = b.additionalData;
                                            if (typeof dataArray === 'string') {
                                                try { dataArray = JSON.parse(dataArray); } catch (e) { return null; }
                                            }
                                            if (!Array.isArray(dataArray)) return null;

                                            return dataArray.map((item, idx) => {
                                                const isObj = typeof item === 'object' && item !== null;
                                                const key = isObj ? item.key : (typeof item === 'string' && item.includes(':') ? item.split(':')[0].trim() : '');
                                                const val = isObj ? item.value : (typeof item === 'string' && item.includes(':') ? item.split(':').slice(1).join(':').trim() : item);
                                                if (!val && !key) return null;
                                                const displayKey = key ? (key.trim().endsWith(':') ? key.trim().slice(0, -1).trim() : key.trim()) : '';
                                                return (
                                                    <div key={idx} className="text-[11px] leading-tight text-gray-800">
                                                        {displayKey ? <b>{displayKey} : </b> : null}
                                                        <span>{val}</span>
                                                    </div>
                                                );
                                            });
                                        })({ business })}
                                        {(!business?.additionalData || business.additionalData.length === 0) && (
                                            <React.Fragment>
                                                <div className="text-[11px] leading-tight text-gray-900 pt-0.5">SH1, Kilimanoor, Thiruvananthapuram, Kerala - 695601</div>
                                                <div className="text-[11px] pt-1"><b>Email ID :</b> rxpharma27@gmail.com</div>
                                                <div className="text-[11px]"><b>GST No :</b> 32ACAFM5688A1ZH</div>
                                                <div className="text-[11px] leading-tight pt-0.5">
                                                    <b>DL No :</b> RLF20KL2026002461 , RLF21KL2026002472
                                                </div>
                                            </React.Fragment>
                                        )}
                                    </div>
                                </div>

                                {/* Middle Box: Invoice Info */}
                                <div className="col-span-3 border-r-2 border-black p-2.5 flex flex-col justify-between">
                                    <div>
                                        <div className="text-center font-black text-[11px] underline uppercase tracking-wide">TAX INVOICE </div>
                                        <div className="space-y-1 text-[11px] mt-2">
                                            <div><b>Inv. No :</b> {invoiceNo || 'IG-INV-2026-001'}</div>
                                            <div className="flex items-center gap-1"><b>Inv. Date :</b> {date}</div>
                                            <div><b>Inv. Time :</b> {time}</div>
                                        </div>
                                    </div>
                                    {paymentMethod && (
                                        <div className="mt-2 pt-1.5">
                                            <span className="bg-white text-black font-bold px-2.5 py-0.5 text-xs tracking-wider uppercase inline-block border-2 border-black">
                                                {paymentMethod}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Right Box: Buyer / Customer */}
                                <div className="col-span-4 p-2.5 space-y-1 text-[11px] flex flex-col justify-between">
                                    <div className="space-y-1.5">
                                        <div className="text-center font-black text-[11px] underline uppercase tracking-wide text-black">
                                            Customer Details
                                        </div>
                                        <div className="text-gray-800 leading-tight">
                                            <b>Name : </b>
                                            <span>{party?.name || 'CASH CUSTOMER'}</span>
                                        </div>
                                        {party?.contact && (
                                            <div className="text-gray-800 leading-tight">
                                                <b>Phone : </b>
                                                <span>{party.contact}</span>
                                            </div>
                                        )}
                                        {(party?.age || party?.gender) && (
                                            <div className="text-gray-800 leading-tight">
                                                {party?.age && <span><b>Age : </b>{party.age}</span>}
                                                {party?.age && party?.gender && <span> &nbsp;|&nbsp; </span>}
                                                {party?.gender && <span><b>Gender : </b>{party.gender}</span>}
                                            </div>
                                        )}

                                        {/* Additional Data or Fallbacks */}
                                        {(() => {
                                            let pData = party?.additionalData;
                                            if (typeof pData === 'string') {
                                                try { pData = JSON.parse(pData); } catch { pData = []; }
                                            }
                                            if (Array.isArray(pData) && pData.length > 0) {
                                                return pData.map((data, idx) => {
                                                    const isObj = typeof data === 'object' && data !== null;
                                                    const key = isObj ? data.key : (typeof data === 'string' && data.includes(':') ? data.split(':')[0].trim() : '');
                                                    const val = isObj ? data.value : (typeof data === 'string' && data.includes(':') ? data.split(':').slice(1).join(':').trim() : data);
                                                    if (!val && !key) return null;
                                                    const displayKey = key ? (key.trim().endsWith(':') ? key.trim().slice(0, -1).trim() : key.trim()) : '';
                                                    return (
                                                        <div key={idx} className="text-gray-800 leading-tight">
                                                            {displayKey ? <b>{displayKey} : </b> : null}
                                                            <span>{val}</span>
                                                        </div>
                                                    );
                                                });
                                            }
                                            return (
                                                <React.Fragment>
                                                    {party?.address && (
                                                        <div className="leading-tight uppercase text-gray-800">
                                                            <b>Address : </b>
                                                            <span>{party.address}</span>
                                                        </div>
                                                    )}
                                                    {(party?.place || (!party?.address && party?.email)) && (
                                                        <div className="leading-tight uppercase text-gray-800">
                                                            <b>Place : </b>
                                                            <span>{party?.place || party?.email}</span>
                                                        </div>
                                                    )}

                                                    {isWholesale && (
                                                        <React.Fragment>
                                                            {party?.dlNo && <div className="text-gray-800">{party.dlNo}</div>}
                                                            {party?.gstinNo && <div className="text-gray-800">{party.gstinNo}</div>}
                                                        </React.Fragment>
                                                    )}
                                                    {party?.panNo && <div className="text-gray-800">{party.panNo}</div>}
                                                </React.Fragment>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Items Table */}
                            <div className="w-full border-b-2 border-black overflow-visible">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-gray-100 border-b border-black text-[10px] font-extrabold uppercase tracking-tight text-black">
                                            {visibleColumns.slNo && <th className="border-r border-black py-1 px-1 text-center w-8">SL.</th>}
                                            {(cols || []).map(col => (
                                                visibleColumns[col] && <th key={col} className="border-r border-black py-1 px-1 text-center">{col.toUpperCase() === "DISCOUNT" ? "DISCOUNT %" : col.toUpperCase() === "GST" ? "GST %" : col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300 text-[10px]">
                                        {(items || []).map((item, index) => (
                                            <tr key={item.id || index} className="hover:bg-gray-50/80 transition-colors group">
                                                {visibleColumns.slNo && (
                                                    <td className="border-r border-black py-1 px-1 text-center font-bold relative w-8">
                                                        <span>{index + 1}</span>
                                                    </td>
                                                )}
                                                {(cols || []).map(col => (
                                                    visibleColumns[col] && (
                                                        <td key={col} className="border-r border-black py-0 px-1 text-center font-mono relative">
                                                            {col === 'Product Name' ? (
                                                                <div className="relative w-full h-full">
                                                                    <div className="w-full text-center text-[10px] font-mono text-black m-0 p-0 h-full">{item[col] || ""}</div>
                                                                </div>
                                                            ) : colTypes && colTypes[col] === "date" ? (
                                                                <span className="relative inline-flex items-center justify-center w-full h-full">
                                                                    <span className="text-[10px] font-mono text-black">{item[col] ? formatDateDMY(item[col]) : col}</span>
                                                                </span>
                                                            ) : (
                                                                <input
                                                                    type={colTypes && colTypes[col] === "number" ? "number" : "text"}
                                                                    value={item[col] || ""}
                                                                    readOnly
                                                                    className="w-full bg-transparent border-none outline-none text-center text-[10px] font-mono text-black m-0 p-0 h-full cursor-default"
                                                                    placeholder={col}
                                                                />
                                                            )}
                                                        </td>
                                                    )
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 4. Calculation Grid */}
                            <div className="grid grid-cols-12 border-b-2 border-black text-[11px]">

                                {/* Col 1: Totals summary (Left Column) */}
                                <div className="col-span-3 border-r-2 border-black p-1.5 space-y-0.5 [&_input]:bg-transparent [&_input]:border-none [&_input]:outline-none [&_input]:text-[10px] [&_input]:w-16 [&_input]:text-right">
                                    <div className="flex justify-between"><b>Total Items :</b> {items?.length || 0}</div>
                                    <div className="flex justify-between items-center"><b>Total No :</b> <span>{displayTotalNo}</span></div>
                                </div>

                                {/* Col 2: GST Tax Breakdown Table & Seal Area (Center Column) */}
                                <div className="col-span-5 border-r-2 border-black flex flex-col justify-between">
                                    {/* Top: GST Tax Breakdown Table */}
                                    <div className="p-1 text-[10px] border-b border-black">
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
                                                {gstBreakdown.rows.map(row => (
                                                    <tr key={row.rate} className="bg-gray-50 font-bold">
                                                        <td className="font-sans font-bold">{row.rate}</td>
                                                        <td>{row.taxable}</td>
                                                        <td>{row.cgst}</td>
                                                        <td>{row.sgst}</td>
                                                        <td>{row.igst}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t border-black font-bold font-mono">
                                                    <td className="font-sans">Total</td>
                                                    <td>{gstBreakdown.totalTaxable}</td>
                                                    <td>{gstBreakdown.totalCgst}</td>
                                                    <td>{gstBreakdown.totalSgst}</td>
                                                    <td>{gstBreakdown.totalIgst}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>

                                    {/* Bottom: Seal Area */}
                                    <div className="p-1 flex flex-col items-center justify-center relative min-h-[90px] flex-1">
                                        <div className="w-full h-full flex flex-wrap items-center justify-center gap-4 relative">
                                            {(!selectedSeals || selectedSeals.length === 0) && (
                                                <span className="text-[10px] text-gray-300 text-center no-print absolute">Seal Area</span>
                                            )}
                                            {(selectedSeals || []).map((sealUrl, index) => {
                                                const rotation = index % 2 === 0 ? '-rotate-3' : 'rotate-2';
                                                return (
                                                    <div key={index} className="relative group/seal">
                                                        <img src={sealUrl} alt="Seal" className={`max-w-[150px] max-h-24 object-contain mix-blend-multiply opacity-85 ${rotation}`} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Col 3: Final Financials & Sign (Right Column) */}
                                <div className="col-span-4 flex flex-col justify-between text-[11px]">
                                    <div className="p-1.5 space-y-0.5 font-mono [&_input]:bg-transparent [&_input]:border-none [&_input]:outline-none [&_input]:text-[11px] [&_input]:w-20 [&_input]:text-right">
                                        <div className="flex justify-between font-sans items-center">
                                            <span>Gross Amt</span>
                                            <input
                                                type="text"
                                                readOnly
                                                className="font-mono font-bold"
                                                value={displayGrossAmt}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex justify-between font-sans items-center">
                                            <span>Dis Amt</span>
                                            <input
                                                type="text"
                                                readOnly
                                                value={totals?.disAmt || ""}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex justify-between font-sans items-center">
                                            <span>Addl Chg</span>
                                            <input
                                                type="text"
                                                readOnly
                                                value={totals?.addlChg || ""}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex justify-between font-sans items-center">
                                            <span>GST Amt</span>
                                            <input
                                                type="text"
                                                readOnly
                                                className="font-mono"
                                                value={displayGstAmt}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex justify-between font-sans items-center">
                                            <span>R.off</span>
                                            <input
                                                type="text"
                                                readOnly
                                                value={totals?.rOff || ""}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-white text-black border-y-2 border-black font-black text-sm px-2.5 py-1.5 flex justify-between items-center tracking-wide">
                                        <span className="whitespace-nowrap">Grand Total</span>
                                        <input
                                            type="text"
                                            readOnly
                                            className="font-mono text-right bg-transparent border-none outline-none w-28"
                                            value={displayGrandTotal}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="p-1.5 text-[10px] space-y-0.5">
                                        <div className="text-left">
                                            <b>For : {business?.name}</b>
                                        </div>
                                        <div className="text-right">
                                            <div className="inline-flex flex-col items-center">
                                                {(() => {
                                                    let sigs = [];
                                                    let rawSigs = business?.signatures;
                                                    if (typeof rawSigs === 'string') {
                                                        try { rawSigs = JSON.parse(rawSigs); } catch (e) { rawSigs = []; }
                                                    }
                                                    if (Array.isArray(rawSigs) && rawSigs.length > 0) {
                                                        sigs = rawSigs.filter(Boolean);
                                                    } else if (business?.signatureImage) {
                                                        sigs = [business.signatureImage];
                                                    }

                                                    let currentSig = sigs.length > 0 ? sigs[0] : null;

                                                    if (!currentSig) {
                                                        let sealsArray = business?.seals;
                                                        if (typeof sealsArray === 'string') {
                                                            try { sealsArray = JSON.parse(sealsArray); } catch (e) { sealsArray = []; }
                                                        }
                                                        if (Array.isArray(sealsArray) && sealsArray.length > 0 && sealsArray[0]) {
                                                            currentSig = sealsArray[0];
                                                        } else if (business?.seal) {
                                                            currentSig = business.seal;
                                                        } else if (template?.signatureImage) {
                                                            currentSig = template.signatureImage;
                                                        }
                                                    }

                                                    return currentSig ? (
                                                        <div className="flex justify-center py-1">
                                                            <img src={currentSig} alt="Signature / Seal" className="h-16 max-w-[180px] object-contain" />
                                                        </div>
                                                    ) : (
                                                        <div className="h-6"></div>
                                                    );
                                                })()}
                                                <b className="border-t border-black px-2 pt-0.5 inline-block text-center">Authorised Signatory</b>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}
