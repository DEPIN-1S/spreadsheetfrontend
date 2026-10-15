import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiPrinter, FiSave, FiEdit2, FiUpload, FiImage, FiFileText } from 'react-icons/fi';

export default function GeneratePersonalInvoiceModal({ isOpen, onClose, template, onSaveInvoice, mode, savedInvoice, allInvoices = [], parties = [], onEdit }) {
    const [invoiceNo, setInvoiceNo] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDetailsData, setToDetailsData] = useState({});
    const [items, setItems] = useState([{}]);
    const [totals, setTotals] = useState({
        totalNo: '', grossAmt: '', disAmt: '', addlChg: '', gstAmt: '', rOff: '', grandTotal: ''
    });
    const [gstPercentage, setGstPercentage] = useState('');
    const [sealImage, setSealImage] = useState('');
    const [signatureImage, setSignatureImage] = useState('');
    const [paymentProofImage, setPaymentProofImage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');
    const isViewMode = mode === 'view';
    const isEditMode = !isViewMode && !!savedInvoice;

    const handlePaymentProofUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (uploadEvent) => {
                setPaymentProofImage(uploadEvent.target.result);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    if (typeof template === 'string') {
        try { template = JSON.parse(template); } catch(e) { template = {}; }
    }

    
    useEffect(() => {
        if (!isOpen) return;

        if (savedInvoice) {
            setInvoiceNo(savedInvoice.invoiceNo || '');
            setInvoiceDate(savedInvoice.date || new Date().toISOString().split('T')[0]);

            let parsedItems = savedInvoice.items;
            if (typeof parsedItems === 'string') {
                try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = [{}]; }
            }
            if (!Array.isArray(parsedItems) || parsedItems.length === 0) parsedItems = [{}];
            setItems(parsedItems);

            let parsedTotals = savedInvoice.totals;
            if (typeof parsedTotals === 'string') {
                try { parsedTotals = JSON.parse(parsedTotals); } catch(e) { parsedTotals = {}; }
            }
            setTotals(parsedTotals || {});

            let parsedTemplate = savedInvoice.template;
            if (typeof parsedTemplate === 'string') {
                try { parsedTemplate = JSON.parse(parsedTemplate); } catch(e) { parsedTemplate = {}; }
            }
            
            // Fallback for toDetailsData
            let initialToDetails = parsedTemplate?.toDetailsData;
            if (!initialToDetails || Object.keys(initialToDetails).length === 0) {
                initialToDetails = {};
                if (parsedTemplate?.toDetails && Array.isArray(parsedTemplate.toDetails)) {
                    parsedTemplate.toDetails.forEach(detail => {
                        initialToDetails[detail.key] = detail.value || '';
                    });
                }
            }
            setToDetailsData(initialToDetails);
            setPaymentMethod(parsedTemplate?.paymentMethod || '');
            setSealImage(parsedTemplate?.sealImage || '');
            setSignatureImage(parsedTemplate?.signatureImage || '');
            setPaymentProofImage(parsedTemplate?.paymentProofImage || parsedTemplate?.paymentProof || savedInvoice?.paymentProofImage || savedInvoice?.paymentProof || '');
        } else if (template) {
            setPaymentProofImage(template?.paymentProofImage || template?.paymentProof || '');
            let maxId = 0;
            if (allInvoices && allInvoices.length > 0) {
                allInvoices.forEach(inv => {
                    if (inv.invoiceNo) {
                        const match = inv.invoiceNo.match(/INV-PI-(\d+)/);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            if (num > maxId) maxId = num;
                        }
                    }
                });
            }
            setInvoiceNo(`INV-PI-${maxId + 1}`);
            setInvoiceDate(new Date().toISOString().split('T')[0]);
            setSealImage('');
            setSignatureImage('');
            const initialToDetails = {};
            if (template.toDetails && Array.isArray(template.toDetails)) {
                template.toDetails.forEach(detail => {
                    initialToDetails[detail.key] = detail.value || '';
                });
                setToDetailsData(initialToDetails);
            }
            setItems([{}]);
            setTotals({
                totalNo: '', grossAmt: '', disAmt: '', addlChg: '', gstAmt: '', rOff: '', grandTotal: ''
            });
        }
    }, [isOpen, template, savedInvoice]);

    if (!isOpen || !template) return null;

    let displayColumns = template?.columns ? [...template.columns] : [];
    if (template?.enableGst && !displayColumns.find(c => c.name.toLowerCase().includes('gst'))) {
        displayColumns.push({ name: 'GST %', type: 'Number' });
    }

    if (template?.grandTotalColumn) {
        const grandTotalColIndex = displayColumns.findIndex(c => c.name === template.grandTotalColumn);
        if (grandTotalColIndex > -1 && grandTotalColIndex !== displayColumns.length - 1) {
            const [grandTotalCol] = displayColumns.splice(grandTotalColIndex, 1);
            displayColumns.push(grandTotalCol);
        }
    }

    const handleToDetailChange = (key, value) => {
        setToDetailsData(prev => ({ ...prev, [key]: value }));
    };

    const handleItemChange = (index, colName, value) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [colName]: value };
            return newItems;
        });
    };

    const addItem = () => {
        setItems(prev => [...prev, {}]);
    };

    const removeItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const calculateGrandTotal = () => {
        if (!template.grandTotalColumn) return 0;
        let total = 0;
        items.forEach(item => {
            const val = parseFloat(item[template.grandTotalColumn]);
            if (!isNaN(val)) total += val;
        });
        return total.toFixed(2);
    };

    const handleTotalChange = (field, value) => {
        setTotals(prev => ({ ...prev, [field]: value }));
    };

    const baseTotal = parseFloat(calculateGrandTotal()) || 0;
    const gross = totals.grossAmt !== '' ? parseFloat(totals.grossAmt) : baseTotal;
    const dis = parseFloat(totals.disAmt) || 0;
    const addl = parseFloat(totals.addlChg) || 0;
    const roff = parseFloat(totals.rOff) || 0;
    
    let calculatedGstAmt = 0;
    let finalGrandTotal = 0;
    const subTotal = (isNaN(gross) ? 0 : gross) - dis + addl;

    const gstColName = displayColumns.find(c => c.name.toLowerCase().includes('gst'))?.name;
    
    let hasItemLevelGst = false;
    if (template?.enableGst && gstColName) {
        hasItemLevelGst = items.some(item => parseFloat(item[gstColName]) > 0);
    }

    if (template?.enableGst) {
        if (hasItemLevelGst) {
            items.forEach(item => {
                const itemAmount = parseFloat(item[template.grandTotalColumn]) || 0;
                const gstRate = parseFloat(item[gstColName]) || 0;
                if (gstRate > 0) {
                    if (template.gstType === 'inclusive') {
                        calculatedGstAmt += itemAmount - (itemAmount / (1 + (gstRate / 100)));
                    } else {
                        calculatedGstAmt += itemAmount * (gstRate / 100);
                    }
                }
            });
            if (template.gstType === 'inclusive') {
                finalGrandTotal = subTotal + roff;
            } else {
                finalGrandTotal = subTotal + calculatedGstAmt + roff;
            }
        } else {
            const gstRate = parseFloat(gstPercentage) || 0;
            if (template.gstType === 'inclusive') {
                calculatedGstAmt = subTotal - (subTotal / (1 + (gstRate / 100)));
                finalGrandTotal = subTotal + roff;
            } else {
                calculatedGstAmt = subTotal * (gstRate / 100);
                finalGrandTotal = subTotal + calculatedGstAmt + roff;
            }
        }
    } else {
        calculatedGstAmt = parseFloat(totals.gstAmt) || 0;
        finalGrandTotal = subTotal + calculatedGstAmt + roff;
    }

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const invoiceData = {
                id: savedInvoice?.id || Date.now(),
                invoiceNo,
                date: invoiceDate,
                clientName: (template?.toDetails?.[0]?.key ? toDetailsData[template.toDetails[0].key] : null) || template?.toDetails?.[0]?.value || Object.values(toDetailsData).find(v => v) || 'Unknown Client',
                templateName: template?.templateName || 'Personal Template',
                grandTotal: finalGrandTotal.toFixed(2),
                items,
                totals
            };
            
            // Strip heavy base64 strings BEFORE deep cloning to avoid freezing the browser main thread
            const templateClone = { ...(template || {}) };
            delete templateClone.signatureImage;
            delete templateClone.seal;
            delete templateClone.sealImage;
            delete templateClone.paymentProof;
            delete templateClone.paymentProofImage;
            delete templateClone.logo;
            delete templateClone.bgImage;
            delete templateClone.background;
            
            // Inject instance data into templateClone so it can be restored on View/Edit
            templateClone.toDetailsData = toDetailsData;
            templateClone.paymentMethod = paymentMethod;
            
            invoiceData.template = JSON.parse(JSON.stringify(templateClone));
            if (sealImage) invoiceData.template.sealImage = sealImage;
            if (signatureImage) invoiceData.template.signatureImage = signatureImage;
            if (paymentProofImage) {
                invoiceData.template.paymentProofImage = paymentProofImage;
                invoiceData.paymentProofImage = paymentProofImage;
            }

            if (onSaveInvoice) {
                onSaveInvoice(invoiceData);
                if (onClose) onClose();
            } else {
                alert("Invoice saved successfully!");
                if (onClose) onClose();
            }
        } catch (e) {
            console.error("handleSave Error:", e);
            alert("Error saving: " + (e.message || String(e)));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 print:p-0 print:bg-transparent print:static">
            
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
                    
                    /* The actual preview container we want to print */
                    #personal-invoice-print-area, #personal-invoice-print-area * {
                        visibility: visible !important;
                    }
                    
                    #personal-invoice-print-area {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        box-sizing: border-box !important;
                        background: #fff !important;
                    }
                    
                    tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .invoice-page-break {
                        page-break-before: always !important;
                        break-before: page !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                        width: 100% !important;
                    }

                    .invoice-proof-img {
                        max-height: 250mm !important;
                        max-width: 100% !important;
                        object-fit: contain !important;
                        display: block !important;
                        margin: 0 auto !important;
                    }
                    
                    /* HOLY GRAIL FIX: Shrink the physical layout space of everything EXCEPT the print area */
                    body :not(:has(#personal-invoice-print-area)):not(#personal-invoice-print-area):not(#personal-invoice-print-area *) {
                        display: none !important;
                    }

                    input, textarea {
                        border: none !important;
                        background: transparent !important;
                        box-shadow: none !important;
                        color: #000 !important;
                        resize: none !important;
                    }
                    input::placeholder, textarea::placeholder {
                        color: transparent !important;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="bg-white rounded-xl shadow-2xl max-w-[1240px] w-full overflow-hidden flex flex-col max-h-[95vh]">
                
                {/* Modal Action Bar (Hidden in Print) */}
                {!isViewMode && (<div className="px-6 py-4 bg-gray-900 text-white flex items-center justify-between no-print border-b border-gray-800 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 ${isEditMode ? 'bg-amber-500' : 'bg-indigo-600'} text-xs font-bold rounded uppercase tracking-wider`}>
                            {isEditMode ? 'Edit Saved Invoice' : 'Generate Invoice'}
                        </span>
                        <h3 className="text-base font-semibold">
                            {template?.templateName || "Personal Template"} {isEditMode && invoiceNo ? `(${invoiceNo})` : ''}
                        </h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 px-4 py-2 ${isEditMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white text-xs font-semibold rounded-lg transition-colors shadow-sm`}>
                            <FiSave /> {isSaving ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update & Save' : 'Save Invoice')}
                        </button>
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-xs font-semibold rounded-lg transition-colors">
                            <FiPrinter /> Print / PDF
                        </button>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg transition-colors" title="Close">
                            <FiX size={20} />
                        </button>
                    </div>
                </div>)}

                {/* View Mode Header */}
                {isViewMode && (
                    <div className="px-6 py-4 bg-white text-gray-900 flex items-center justify-between no-print border-b border-gray-200 shrink-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold">View Invoice</h2>
                            {invoiceNo && (
                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                    {invoiceNo}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {onEdit && (
                                <button 
                                    onClick={() => onEdit(savedInvoice)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                                >
                                    <FiEdit2 size={14} /> Edit Invoice
                                </button>
                            )}
                            <button onClick={() => window.print()} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors shadow-xs">
                                Print / Save PDF
                            </button>
                            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Close">
                                <FiX size={20} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="overflow-y-auto p-6 flex-1 bg-gray-100">
                    <div id="personal-invoice-print-area" className="max-w-[900px] w-full mx-auto space-y-8 print:space-y-0">
                        
                        {/* PAGE 1: INVOICE */}
                        <div className="bg-white border-2 border-black text-black font-sans text-xs shadow-lg w-full print:shadow-none print:border-2 print:border-black">
                        
                        {/* 1. Header Grid */}
                        <div className="grid grid-cols-12 border-b-2 border-black shrink-0">
                            
                            {/* Left Box: Seller */}
                            <div className="col-span-5 border-r-2 border-black p-2.5 space-y-1.5">
                                <div className="flex items-center gap-2 mb-2">
                                    {template.logo && <img src={template.logo} alt="Logo" className="h-12 object-contain" />}
                                    {template.fromDetails?.[0] && (
                                        <span className="font-extrabold text-lg">{template.fromDetails[0].value || template.fromDetails[0].key}</span>
                                    )}
                                </div>
                                <div className="space-y-1 mt-1">
                                    {template.fromDetails?.slice(1).map((detail, idx) => (
                                        <div key={idx} className="text-[11px] leading-tight text-gray-800">
                                            {detail.key ? <b>{detail.key} : </b> : null}
                                            <span>{detail.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Middle Box: Invoice Info */}
                            <div className="col-span-3 border-r-2 border-black p-2.5 flex flex-col justify-between">
                                <div>
                                    <div className="text-center font-black text-[11px] underline uppercase tracking-wide">INVOICE </div>
                                    <div className="space-y-1 text-[11px] mt-2">
                                        <div className="flex items-center gap-1">
                                            <b className="whitespace-nowrap">Inv No. :</b> 
                                            <input 
                                                type="text" 
                                                value={invoiceNo} 
                                                onChange={(e) => setInvoiceNo(e.target.value)}
                                                readOnly={isViewMode} className="bg-transparent border-none outline-none w-full text-[11px] text-gray-900 m-0 p-0"
                                            />
                                        </div>
                                    </div>

                                    {template?.paymentModes && (template.paymentModes.cash || template.paymentModes.upi || template.paymentModes.bank) && (
                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                            {[
                                                template.paymentModes.cash && 'Cash',
                                                template.paymentModes.upi && 'UPI',
                                                template.paymentModes.bank && 'Bank'
                                            ].filter(Boolean).map(mode => (
                                                <span
                                                    key={mode}
                                                    className="bg-white text-black font-bold px-2.5 py-0.5 text-xs tracking-wider uppercase inline-block border-2 border-black"
                                                >
                                                    {mode}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Box: Buyer / Customer */}
                            <div className="col-span-4 p-2.5 space-y-1 text-[11px] flex flex-col justify-between">
                                <div className="space-y-1.5">
                                    <div className="text-center font-black text-[11px] underline uppercase tracking-wide text-black mb-1">
                                        Billed To
                                    </div>
                                    {template.toDetails?.map((detail, idx) => (
                                        <div key={idx} className="flex items-center gap-1 leading-tight text-gray-800">
                                            {detail.key ? <b className="whitespace-nowrap">{detail.key} : </b> : null}
                                            <input 
                                                type="text" 
                                                value={toDetailsData[detail.key] || ''}
                                                onChange={(e) => handleToDetailChange(detail.key, e.target.value)}
                                                placeholder={`Enter ${detail.key}`}
                                                readOnly={isViewMode} className="bg-transparent border-none outline-none w-full text-[11px] text-gray-900 m-0 p-0"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. Items Table */}
                        <div className="w-full border-b-2 border-black">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-black text-[10px] font-extrabold uppercase tracking-tight text-black">
                                        <th className="border-r border-black py-1 px-1 text-center w-8">SL.</th>
                                        {displayColumns.map(col => (
                                            <th key={col.name} className={`border-r border-black py-1 px-1 text-center ${col.name === 'Description' ? 'w-[40%]' : ''}`}>
                                                {col.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 text-[10px]">
                                    {items.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50/80 transition-colors relative group">
                                            <td className="border-r border-black py-1 px-1 text-center font-bold relative">
                                                {index + 1}
                                                {!isViewMode && <button onClick={() => removeItem(index)} className="absolute right-0.5 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 p-0.5 hover:bg-red-50 rounded transition-colors no-print opacity-0 group-hover:opacity-100"><FiTrash2 size={12} /></button>}
                                            </td>
                                            {displayColumns.map(col => (
                                                <td key={col.name} className="border-r border-black py-0 px-1 text-center font-mono relative">
                                                    {col.type === 'Date' || col.name.toLowerCase().includes('date') ? (
                                                        <input 
                                                            type="date"
                                                            value={item[col.name] || ''}
                                                            onChange={(e) => handleItemChange(index, col.name, e.target.value)}
                                                            readOnly={isViewMode}
                                                            className="w-full bg-transparent border-none outline-none text-center text-[10px] font-mono text-black m-0 p-0 h-full"
                                                            style={{ minHeight: '30px', lineHeight: '1.2' }}
                                                        />
                                                    ) : (
                                                        <textarea 
                                                            rows={2}
                                                            value={item[col.name] || ''}
                                                            onChange={(e) => {
                                                                let val = e.target.value;
                                                                if (col.type === 'Number') {
                                                                    val = val.replace(/[^0-9.]/g, '');
                                                                    const parts = val.split('.');
                                                                    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                                                                }
                                                                handleItemChange(index, col.name, val);
                                                            }}
                                                            readOnly={isViewMode}
                                                            className="w-full bg-transparent border-none outline-none text-center text-[10px] font-mono text-black m-0 p-0 h-full resize-none overflow-hidden block"
                                                            style={{ minHeight: '30px', lineHeight: '1.2' }}
                                                            placeholder={col.name}
                                                        />
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {!isViewMode && (<tr className="no-print">
                                        <td colSpan={(displayColumns.length || 0) + 1} className="p-1 border-t border-black">
                                            <button onClick={addItem} className="text-[10px] text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1 mx-auto bg-indigo-50 px-2 py-1 rounded">
                                                <FiPlus size={12} /> Add Row
                                            </button>
                                        </td>
                                      </tr>)}
                                  </tbody>
                            </table>
                        </div>

                        {/* 3. Totals and Footer */}
                        <div className="grid grid-cols-12 text-[11px]">
                            
                            {/* Col 1: Totals summary (Left Column) */}
                            <div className="col-span-3 border-r-2 border-black p-1.5 space-y-0.5 [&_input]:bg-transparent [&_input]:border-none [&_input]:outline-none [&_input]:text-[10px] [&_input]:w-16 [&_input]:text-right">
                                <div className="flex justify-between"><b>Total Items :</b> {items.length}</div>
                                <div className="flex justify-between items-center">
                                    <b>Total No :</b> 
                                    <input type="text" value={totals.totalNo} onChange={(e) => handleTotalChange('totalNo', e.target.value)} placeholder="0" />
                                </div>
                            </div>

                            {/* Col 2: Center Column */}
                            <div className="col-span-5 border-r-2 border-black flex flex-col items-center justify-center">
                                {/* Seal Area */}
                                <div className="p-1 flex flex-col items-center justify-center relative group min-h-[150px] w-full m-2">
                                    <div className="w-full h-full flex items-center justify-center relative">
                                        {!sealImage && !isViewMode && (
                                            <span className="text-[10px] text-gray-300 text-center no-print absolute top-1 pointer-events-none font-bold uppercase tracking-widest">Seal Area</span>
                                        )}
                                        {sealImage && (
                                            <div className="relative group/seal">
                                                <img src={sealImage} alt="Seal" className="max-w-[250px] max-h-[150px] object-contain mix-blend-multiply opacity-85 -rotate-2" />
                                                <button onClick={() => setSealImage('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/seal:opacity-100 transition-opacity shadow-md z-50 no-print" title="Remove Seal"><FiX size={10} /></button>
                                            </div>
                                        )}
                                    </div>
                                    {!sealImage && !isViewMode && (
                                        <div className="no-print absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-2 z-50">
                                            <label className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded cursor-pointer whitespace-nowrap shadow-xs border border-indigo-200 transition-colors">
                                                <FiPlus size={11} /> Add Seal
                                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onload = (e) => setSealImage(e.target.result);
                                                        reader.readAsDataURL(file);
                                                        }
                                                        e.target.value = '';
                                                }} />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Col 3: Final Financials & Sign (Right Column) */}
                            <div className="col-span-4 flex flex-col justify-between text-[11px]">
                                <div className="p-1.5 space-y-0.5 font-mono [&_input]:bg-transparent [&_input]:border-none [&_input]:outline-none [&_input]:text-[11px] [&_input]:w-20 [&_input]:text-right">
                                    <div className="flex justify-between font-sans items-center">
                                        <span>Gross Amt</span>
                                        <input type="text" className="font-mono font-bold" value={totals.grossAmt} onChange={(e) => handleTotalChange('grossAmt', e.target.value)} placeholder={calculateGrandTotal()} />
                                    </div>
                                    <div className="flex justify-between font-sans items-center">
                                        <span>Dis Amt</span>
                                        <input type="text" value={totals.disAmt} onChange={(e) => handleTotalChange('disAmt', e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="flex justify-between font-sans items-center">
                                        <span>Addl Chg</span>
                                        <input type="text" value={totals.addlChg} onChange={(e) => handleTotalChange('addlChg', e.target.value)} placeholder="0.00" />
                                    </div>
                                    {template?.enableGst ? (
                                        <div className="flex justify-between font-sans items-center">
                                            {gstColName ? (
                                                <span>GST Amt</span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    GST <input type="text" className="font-mono w-8 bg-gray-100 border rounded px-1 text-center outline-none" value={gstPercentage} onChange={(e) => setGstPercentage(e.target.value)} placeholder="0" /> %
                                                </span>
                                            )}
                                            <input type="text" className="font-mono text-right bg-transparent border-none outline-none w-20" value={calculatedGstAmt > 0 ? calculatedGstAmt.toFixed(2) : ''} readOnly placeholder="0.00" />
                                        </div>
                                    ) : (
                                        <div className="flex justify-between font-sans items-center">
                                            <span>GST Amt</span>
                                            <input type="text" className="font-mono text-right bg-transparent border-none outline-none w-20" value={totals.gstAmt} onChange={(e) => handleTotalChange('gstAmt', e.target.value)} placeholder="0.00" />
                                        </div>
                                    )}
                                    <div className="flex justify-between font-sans items-center">
                                        <span>R.off</span>
                                        <input type="text" value={totals.rOff} onChange={(e) => handleTotalChange('rOff', e.target.value)} placeholder="0.00" />
                                    </div>
                                </div>
                                <div className="bg-white text-black border-y-2 border-black font-black text-sm px-2.5 py-1.5 flex justify-between items-center tracking-wide">
                                    <span className="whitespace-nowrap">Grand Total</span>
                                    <input 
                                        type="text" 
                                        className="font-mono text-right bg-transparent border-none outline-none w-28" 
                                        value={totals.grandTotal !== '' ? totals.grandTotal : (finalGrandTotal > 0 ? finalGrandTotal.toFixed(2) : '')} 
                                        onChange={(e) => handleTotalChange('grandTotal', e.target.value)} 
                                        placeholder="0.00" 
                                    />
                                </div>
                                <div className="p-1.5 text-[10px] space-y-0.5 flex-1 relative flex flex-col justify-between min-h-[80px]">
                                    <div className="text-left font-bold truncate">
                                        For : {template.fromDetails?.[0]?.value || 'Personal'}
                                    </div>
                                    <div className="flex justify-end items-end px-2 mt-4">
                                        {/* Signature Section */}
                                        <div className="flex flex-col items-center justify-end">
                                            {signatureImage ? (
                                                <div className="relative group mb-1">
                                                    <img src={signatureImage} alt="Signature" className="h-12 w-auto object-contain mix-blend-multiply" />
                                                    <button onClick={() => setSignatureImage('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity no-print"><FiX size={10} /></button>
                                                </div>
                                            ) : !isViewMode ? (
                                                <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1.5 no-print border border-dashed border-indigo-300 hover:border-indigo-400 px-2.5 py-1 rounded-lg text-[11px] bg-indigo-50/60 hover:bg-indigo-50 shadow-2xs transition-colors mb-1.5">
                                                    <FiPlus size={12} /> Add Signature
                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onload = (e) => setSignatureImage(e.target.result);
                                                            reader.readAsDataURL(file);
                                                        }
                                                        e.target.value = '';
                                                    }} />
                                                </label>
                                            ) : null}
                                            <div className="font-bold text-gray-800">Authorized Signatory</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PAGE 2: PAYMENT PROOF */}
                    {paymentProofImage && (
                        <div className="invoice-page-break bg-white w-full print:w-full flex flex-col items-center justify-center min-h-[900px] print:min-h-[1050px] relative group p-4 print:p-0">
                            <div className="w-full text-center mb-3 print:mb-2">
                                <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                                    Payment Proof
                                </span>
                            </div>
                            <img 
                                src={paymentProofImage} 
                                alt="Payment Proof" 
                                className="invoice-proof-img max-h-[85vh] print:max-h-[250mm] max-w-full object-contain mx-auto block"
                            />
                            {!isViewMode && (
                                <div className="no-print absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-xs p-1.5 rounded-lg shadow-md border border-gray-200">
                                    <label className="cursor-pointer text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1">
                                        <FiUpload size={13} /> Change Proof
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePaymentProofUpload} />
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={() => setPaymentProofImage('')} 
                                        className="text-xs font-semibold text-red-600 hover:text-red-800 px-2.5 py-1 hover:bg-red-50 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                        <FiTrash2 size={13} /> Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Upload Banner in preview if no proof attached yet */}
                    {!paymentProofImage && !isViewMode && (
                        <div className="no-print bg-white border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-xl p-6 transition-all text-center max-w-[900px] w-full mx-auto shadow-xs group">
                            <label className="cursor-pointer flex flex-col items-center justify-center gap-2">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs border border-indigo-100">
                                    <FiUpload size={22} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800">Add Payment Proof</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Upload payment receipt or transaction screenshot to print as a new page in the PDF</p>
                                </div>
                                <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors border border-indigo-200">
                                    <FiPlus size={14} /> Select Payment Proof Image
                                </span>
                                <input type="file" accept="image/*" className="hidden" onChange={handlePaymentProofUpload} />
                            </label>
                        </div>
                    )}

                    </div>
                </div>
            </div>
        </div>
    );
}
