import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiPrinter, FiSettings, FiTrash2, FiPlus } from 'react-icons/fi';
import apiClient from '../api/apiClient';

export default function GenerateInvoiceModal({ isOpen, onClose, business, party, template }) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const settingsRef = useRef(null);
    const [inventoryData, setInventoryData] = useState([]);
    const [selectedSeal, setSelectedSeal] = useState(null);
    const [activeDropdownRow, setActiveDropdownRow] = useState(null);
    const [previewProduct, setPreviewProduct] = useState(null);

    const sheetsToFetchCacheRef = useRef([]);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        const fetchSheetsList = async () => {
            try {
                let targetSheetIds = [];
                if (Array.isArray(template?.spreadsheetIds) && template.spreadsheetIds.length > 0) {
                    targetSheetIds = template.spreadsheetIds;
                } else if (typeof template?.spreadsheetIds === 'string') {
                    try {
                        const parsed = JSON.parse(template.spreadsheetIds);
                        if (Array.isArray(parsed) && parsed.length > 0) targetSheetIds = parsed;
                    } catch (e) {
                        if (template.spreadsheetIds.includes(',')) {
                            targetSheetIds = template.spreadsheetIds.split(',').map(s => s.trim()).filter(Boolean);
                        } else if (template.spreadsheetIds.trim() && !template.spreadsheetIds.startsWith('[')) {
                            targetSheetIds = [template.spreadsheetIds.trim()];
                        }
                    }
                }
                if (targetSheetIds.length === 0 && template?.spreadsheetId) {
                    targetSheetIds = [template.spreadsheetId];
                }

                let sheetsList = [];
                if (targetSheetIds.length === 0) {
                    const sheetsRes = await apiClient.get('/sheets?forInvoiceGenerator=true');
                    const sheetsData = sheetsRes.data?.data;
                    sheetsList = Array.isArray(sheetsData) ? sheetsData : (sheetsData?.files || []);
                } else {
                    sheetsList = targetSheetIds.map(id => ({ id }));
                }
                sheetsToFetchCacheRef.current = sheetsList;
            } catch (err) {
                console.error("Failed to fetch sheets list:", err);
            }
        };
        if (isOpen) {
            fetchSheetsList();
            setInventoryData([]);
        }
    }, [isOpen, template]);

    let cols = [];
    if (template?.columns) {
        if (typeof template.columns === 'string') {
            try {
                let parsed = JSON.parse(template.columns);
                if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed); // Handle double stringified
                }
                if (Array.isArray(parsed)) {
                    cols = parsed;
                }
            } catch(e) {
                if (template.columns.includes(',')) {
                    cols = template.columns.split(',').map(s => s.trim()).filter(Boolean);
                } else if (template.columns.trim() && !template.columns.startsWith('[')) {
                    cols = [template.columns.trim()];
                }
            }
        } else if (Array.isArray(template.columns)) {
            cols = template.columns;
        }
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
        slNo: true,
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

    const [items, setItems] = useState(() => [{ id: Date.now(), description: '', ...cols.reduce((acc, col) => ({ ...acc, [col]: '' }), {}) }]);
    const [totals, setTotals] = useState({ 
        totalNo: '', saleValue: '', schDiscGiven: '', cashDisc: '', 
        totalGst: '', grossAmt: '', disAmt: '', addlChg: '', rOff: '', grandTotal: '' 
    });

    if (!isOpen || !business) return null;

    const handlePrint = () => {
        window.print();
    };

    const handleItemChange = (id, field, value) => {
        let updatedItem = { [field]: value };
        
        if (field === 'Product Name') {
            const trimmed = value ? value.toString().trim() : '';
            const currentItem = items.find(item => item.id === id);
            if (trimmed) {
                if (!currentItem?.['Qty'] || currentItem['Qty'] === '') {
                    updatedItem['Qty'] = '1';
                }
            } else {
                updatedItem['Qty'] = '';
                updatedItem['Total'] = '';
            }
            
            if (inventoryData.length > 0) {
                const searchValue = value ? value.toString().toLowerCase() : '';
                const matchedProduct = inventoryData.find(p => p['Product Name'] && p['Product Name'].toString().toLowerCase() === searchValue);
                if (matchedProduct) {
                    if (matchedProduct['MRP']) updatedItem['MRP'] = matchedProduct['MRP'];
                    if (matchedProduct['Discount']) updatedItem['Discount'] = matchedProduct['Discount'];
                    if (matchedProduct['Selling Rate']) updatedItem['Selling Rate'] = matchedProduct['Selling Rate'];
                    if (matchedProduct['GST']) updatedItem['GST'] = matchedProduct['GST'];
                }
            }
        }
        
        const currentItem = items.find(item => item.id === id);
        const mergedItem = { ...currentItem, ...updatedItem };

        if (field !== 'Total' && cols.includes('Total')) {
            const qty = parseFloat(mergedItem['Qty']) || 0;
            const rate = parseFloat(mergedItem['Selling Rate']) || parseFloat(mergedItem['MRP']) || 0;
            if (qty > 0 && rate > 0) {
                updatedItem['Total'] = (qty * rate).toFixed(2);
            } else {
                updatedItem['Total'] = '';
            }
        }
        setItems(items.map(item => item.id === id ? { ...item, ...updatedItem } : item));

        if (field === 'Product Name' && value.length >= 1) {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const currentSheets = sheetsToFetchCacheRef.current; if (currentSheets.length === 0) { return; }
                    
                    const fetchPromises = currentSheets.map(sheet => apiClient.get('/sheets/' + sheet.id + '/data?search=' + encodeURIComponent(value)));
                    const responses = await Promise.all(fetchPromises);
                    
                    let allParsedData = [];
                    responses.forEach(res => {
                        const { grid = [] } = res.data.data;
                        const parsedData = grid.map(row => {
                            const rowData = {};
                            (row.cells || []).forEach(cell => {
                                let colName = (cell.columnName || '').trim();
                                const upperColName = colName.toUpperCase();

                                if (upperColName === 'GST%' || upperColName === 'GST') colName = 'GST';
                                else if (upperColName === 'PRODUCT NAME') colName = 'Product Name';
                                else if (upperColName === 'MRP') colName = 'MRP';
                                else if (upperColName === 'DISCOUNT') colName = 'Discount';
                                else if (upperColName === 'SELLING RATE') colName = 'Selling Rate';
                                else if (upperColName === 'IMAGE' || upperColName === 'PRODUCT IMAGE') colName = 'Image';
                                else if (upperColName === 'COMPOSITION') colName = 'Composition';

                                rowData[colName] = cell.computedValue || cell.rawValue || '';
                            });
                            return rowData;
                        });
                        allParsedData = [...allParsedData, ...parsedData];
                    });
                    
                    allParsedData = allParsedData.filter(d => d['Product Name']);
                    setInventoryData(allParsedData);
                } catch (err) {
                    console.error('Failed to fetch inventory search results:', err);
                }
            }, 300);
        }
    };

    const handleQtyBlur = (id, value) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const hasProduct = item['Product Name'] && item['Product Name'].trim() !== '';
            if (hasProduct && (value === '' || value === null || value === undefined || (typeof value === 'string' && value.trim() === ''))) {
                const rate = parseFloat(item['Selling Rate']) || parseFloat(item['MRP']) || 0;
                const total = rate > 0 && cols.includes('Total') ? (1 * rate).toFixed(2) : (item['Total'] || '');
                return { ...item, Qty: '1', Total: total };
            }
            return item;
        }));
    };

    const addRow = () => {
        setItems([...items, { id: Date.now(), description: '', ...cols.reduce((acc, col) => ({ ...acc, [col]: '' }), {}) }]);
    };

    const removeRow = (id) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(item => item.id !== id));
        } else {
            setItems(prev => [{ ...prev[0], "Product Name": "", Qty: "", MRP: "", Discount: "", "Selling Rate": "", GST: "", Total: "", description: "" }]);
        }
    };

    const handleTotalChange = (field, value) => {
        setTotals(prev => {
            const next = { ...prev, [field]: value };
            if (field !== 'grandTotal') {
                delete next.manualGrandTotal;
            } else {
                next.manualGrandTotal = value;
            }
            return next;
        });
    };

        const totalNoCalc = items.reduce((sum, item) => sum + (parseFloat(item.Qty) || 0), 0);
    const totalItemsCount = items.filter(it => it['Product Name'] && it['Product Name'].trim()).length || items.length;
    const totalGrossCalc = items.reduce((sum, item) => {
        const totalVal = parseFloat(item.Total);
        if (!isNaN(totalVal)) return sum + totalVal;
        const qty = parseFloat(item.Qty) || 0;
        const rate = parseFloat(item['Selling Rate']) || parseFloat(item['MRP']) || 0;
        return sum + (qty * rate);
    }, 0);
    const grossVal = parseFloat(totals.grossAmt !== '' ? totals.grossAmt : totalGrossCalc) || 0;
    const disVal = parseFloat(totals.disAmt) || 0;
    const addlVal = parseFloat(totals.addlChg) || 0;
    const totalGstCalc = items.reduce((sum, item) => {
        const gstPercent = parseFloat(item.GST) || 0;
        const lineTotal = parseFloat(item.Total) || ((parseFloat(item.Qty) || 0) * (parseFloat(item['Selling Rate']) || parseFloat(item['MRP']) || 0));
        return sum + (lineTotal * gstPercent / 100);
    }, 0);
    const gstVal = parseFloat(totals.totalGst !== '' ? totals.totalGst : (totalGstCalc > 0 ? totalGstCalc : 0)) || 0;
    const roffVal = parseFloat(totals.rOff) || 0;
    const computedGrandTotal = (grossVal - disVal + addlVal + gstVal + roffVal).toFixed(2);


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
                                        {party?.name || 'CASH CUSTOMER'}
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
                                            try { pData = JSON.parse(pData); } catch (e) { pData = []; }
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
                                            <>
                                                {(party?.address || party?.email) && (
                                                    <div className="leading-tight uppercase text-gray-800">
                                                        {party?.address || party?.email}
                                                    </div>
                                                )}
                                                {!isWholesale && party?.age && <div className="text-gray-800">{party.age}</div>}
                                                {isWholesale && (
                                                    <>
                                                        {party?.dlNo && <div className="text-gray-800">{party.dlNo}</div>}
                                                        {party?.gstinNo && <div className="text-gray-800">{party.gstinNo}</div>}
                                                    </>
                                                )}
                                                {party?.panNo && <div className="text-gray-800">{party.panNo}</div>}
                                            </>
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
                                        {cols.map(col => (
                                            visibleColumns[col] && <th key={col} className="border-r border-black py-1 px-1 text-center">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300 text-[10px]">
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                                                {visibleColumns.slNo && (
                                                <td className="border-r border-black py-1 px-1 text-center font-bold relative w-8">
                                                    <span>{index + 1}</span>
                                                    <button onClick={() => removeRow(item.id)} className="absolute right-0 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 no-print" title="Remove Row"><FiTrash2 size={10}/></button>
                                                </td>
                                                )}
                                            {cols.map(col => (
                                                visibleColumns[col] && (
                                                    <td key={col} className="border-r border-black py-0 px-1 text-center font-mono relative">
                                                        {col === 'Product Name' ? (
                                                            <div className="relative w-full h-full">
                                                                <input 
                                                                    type="text" 
                                                                    value={item[col] || ''} 
                                                                    onChange={(e) => {
                                                                        handleItemChange(item.id, col, e.target.value);
                                                                        setActiveDropdownRow(item.id);
                                                                    }} 
                                                                    onFocus={() => setActiveDropdownRow(item.id)}
                                                                    onBlur={() => setTimeout(() => setActiveDropdownRow(null), 200)}
                                                                    className="w-full bg-transparent border-none outline-none text-center text-[10px] font-mono text-black m-0 p-0 h-full" 
                                                                    placeholder={col} 
                                                                />
                                                                {activeDropdownRow === item.id && inventoryData.length > 0 && (
                                                                    <div className="absolute z-[100] bg-white border border-gray-200 shadow-xl max-h-60 overflow-y-auto min-w-[350px] max-w-[500px] w-max top-full left-0 mt-1 rounded text-left no-print">
                                                                        {inventoryData.map((prod, idx) => {
                                                                            let imgSrc = prod['Image'];
                                                                            
                                                                            if (imgSrc) {
                                                                                if (typeof imgSrc === 'string' && imgSrc.includes('=')) {
                                                                                    const match = imgSrc.match(/IMAGE\(["'](.*?)["']\)/i);
                                                                                    if (match) imgSrc = match[1];
                                                                                }
                                                                                
                                                                                let parseAttempts = 0;
                                                                                while (typeof imgSrc === 'string' && (imgSrc.startsWith('[') || imgSrc.startsWith('{') || imgSrc.startsWith('"')) && parseAttempts < 3) {
                                                                                    try {
                                                                                        const parsed = JSON.parse(imgSrc);
                                                                                        if (typeof parsed === 'string' && parsed === imgSrc) break;
                                                                                        imgSrc = parsed;
                                                                                    } catch (e) {
                                                                                        break;
                                                                                    }
                                                                                    parseAttempts++;
                                                                                }

                                                                                if (Array.isArray(imgSrc) && imgSrc.length > 0) {
                                                                                    imgSrc = imgSrc[0];
                                                                                }

                                                                                if (typeof imgSrc === 'object' && imgSrc !== null) {
                                                                                    imgSrc = imgSrc.url || imgSrc.src || '';
                                                                                }
                                                                                
                                                                                if (typeof imgSrc === 'string') {
                                                                                    imgSrc = imgSrc.trim();
                                                                                    if (imgSrc.startsWith('/uploads/') || imgSrc.startsWith('uploads/')) {
                                                                                        if (imgSrc.startsWith('uploads/')) imgSrc = '/' + imgSrc;
                                                                                        const baseUrl = (apiClient && apiClient.defaults && apiClient.defaults.baseURL) ? apiClient.defaults.baseURL : 'http://localhost:6041/api';
                                                                                        imgSrc = baseUrl.replace('/api', '') + imgSrc;
                                                                                    }
                                                                                }
                                                                            }
                                                                            
                                                                            return (
                                                                            <div 
                                                                                key={idx} 
                                                                                className="p-2 border-b border-gray-100 hover:bg-indigo-50 cursor-pointer flex gap-3 items-center relative"
                                                                                onMouseDown={(e) => e.preventDefault()}
                                                                                onClick={() => {
                                                                                    handleItemChange(item.id, col, prod['Product Name']);
                                                                                    setActiveDropdownRow(null);
                                                                                }}
                                                                            >
                                                                                {imgSrc ? (
                                                                                    <img src={imgSrc} onClick={(e) => { e.stopPropagation(); setPreviewProduct({ ...prod, _resolvedImgSrc: imgSrc }); }} className="w-12 h-12 object-cover rounded bg-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity" alt="img" onError={(e) => { 
                                                                                        if (!e.target.dataset.retried && e.target.src.includes('localhost')) {
                                                                                            e.target.dataset.retried = 'true';
                                                                                            e.target.src = e.target.src.replace(/http:\/\/localhost:\d+/, 'https://apis.datsheets.in');
                                                                                        } else {
                                                                                            e.target.style.display='none'; 
                                                                                            e.target.nextSibling.style.display='block'; 
                                                                                        }
                                                                                    }} />
                                                                                ) : (
                                                                                    <div className="w-12 h-12 rounded bg-gray-200 flex-shrink-0 flex items-center justify-center text-[8px] text-gray-400 border border-gray-300">No Img</div>
                                                                                )}
                                                                                <div style={{display:'none'}} className="absolute left-16 top-2 text-[10px] text-white bg-black/90 px-2 py-1.5 rounded whitespace-nowrap z-[200] shadow-xl pointer-events-none font-sans font-medium tracking-wide">
                                                                                    {imgSrc}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="font-bold text-gray-900 text-[11px] leading-tight break-words">{prod['Product Name']}</div>
                                                                                    {prod['Composition'] && (
                                                                                        <div className="text-[9px] text-gray-500 mt-0.5 whitespace-normal leading-tight break-words">{prod['Composition']}</div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )})}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                value={item[col] || ''} 
                                                                onChange={(e) => handleItemChange(item.id, col, e.target.value)} 
                                                                onBlur={col === 'Qty' ? (e) => handleQtyBlur(item.id, e.target.value) : undefined} 
                                                                onKeyDown={col === 'Qty' ? (e) => { if (e.key === 'Enter') e.target.blur(); } : undefined} 
                                                                className="w-full bg-transparent border-none outline-none text-center text-[10px] font-mono text-black m-0 p-0 h-full" 
                                                                placeholder={col}
                                                            />
                                                        )}
                                                    </td>
                                                )
                                            ))}
                                        </tr>
                                    ))}
                                    <tr className="no-print border-b border-black">
                                        <td colSpan={100} className="p-1 text-center">
                                            <button onClick={addRow} className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded">
                                                <FiPlus size={12} /> Add Row
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        {/* 4. Calculation Grid */}
                        <div className="grid grid-cols-12 border-b-2 border-black text-[11px]">
                            
                            {/* Col 1: Totals summary */}
                            <div className="col-span-3 border-r-2 border-black p-1.5 space-y-0.5 [&_input]:bg-transparent [&_input]:border-none [&_input]:outline-none [&_input]:text-[10px] [&_input]:w-16 [&_input]:text-right">
                                <div className="flex justify-between"><b>Total Items :</b> {totalItemsCount}</div>
                                <div className="flex justify-between items-center"><b>Total No :</b> <input type="text" value={totals.totalNo !== '' ? totals.totalNo : (totalNoCalc > 0 ? totalNoCalc : '')} onChange={(e) => handleTotalChange('totalNo', e.target.value)} placeholder={totalNoCalc > 0 ? String(totalNoCalc) : '0'} /></div>
                            </div>

                            {/* Col 2: Empty Spacer / Seal Selection */}
                            <div className="col-span-4 border-r-2 border-black p-1 flex flex-col items-center justify-center relative group">
                                {selectedSeal ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img src={selectedSeal} alt="Seal" className="max-w-full max-h-24 object-contain mix-blend-multiply" />
                                        <button onClick={() => setSelectedSeal(null)} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 no-print transition-opacity" title="Remove Seal"><FiX size={10} /></button>
                                    </div>
                                ) : (
                                    <div className="no-print w-full h-full flex items-center justify-center">
                                        {(() => {
                                            let sealsArray = business?.seals;
                                            if (typeof sealsArray === 'string') {
                                                try { sealsArray = JSON.parse(sealsArray); } catch(e) { sealsArray = []; }
                                            }
                                            if (Array.isArray(sealsArray) && sealsArray.length > 0) {
                                                return (
                                                    <div className="relative inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-2 py-0.5 rounded cursor-pointer">
                                                        <FiPlus size={12} /> Add Seal
                                                        <select 
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            onChange={(e) => {
                                                                if(e.target.value !== "") {
                                                                    setSelectedSeal(sealsArray[parseInt(e.target.value)]);
                                                                }
                                                            }}
                                                            value=""
                                                            title="Add Seal"
                                                        >
                                                            <option value="" disabled>Select Seal...</option>
                                                            {sealsArray.map((seal, idx) => (
                                                                <option key={idx} value={idx}>Seal {idx + 1}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                );
                                            } else {
                                                return <span className="text-[10px] text-gray-400 text-center">No seals available in business profile</span>;
                                            }
                                        })()}
                                    </div>
                                )}
                            </div>

                            {/* Col 4: Final Financials & Sign */}
                            <div className="col-span-5 flex flex-col justify-between text-[11px]">
                                <div className="p-1.5 space-y-0.5 font-mono [&_input]:bg-transparent [&_input]:border-none [&_input]:outline-none [&_input]:text-[11px] [&_input]:w-20 [&_input]:text-right">
                                    <div className="flex justify-between font-sans items-center"><span>Gross Amt</span><input type="text" className="font-mono font-bold" value={totals.grossAmt !== '' ? totals.grossAmt : (totalGrossCalc > 0 ? totalGrossCalc.toFixed(2) : '')} onChange={(e) => handleTotalChange('grossAmt', e.target.value)} placeholder="0.00" /></div>
                                    <div className="flex justify-between font-sans items-center"><span>Dis Amt</span><input type="text" value={totals.disAmt} onChange={(e) => handleTotalChange('disAmt', e.target.value)} placeholder="0.00" /></div>
                                    <div className="flex justify-between font-sans items-center"><span>Addl Chg</span><input type="text" value={totals.addlChg} onChange={(e) => handleTotalChange('addlChg', e.target.value)} placeholder="0.00" /></div>
                                    <div className="flex justify-between font-sans items-center"><span>GST Amt</span><input type="text" className="font-mono" value={totals.totalGst !== '' ? totals.totalGst : (totalGstCalc > 0 ? totalGstCalc.toFixed(2) : '')} onChange={(e) => handleTotalChange('totalGst', e.target.value)} placeholder="0.00" /></div>
                                    <div className="flex justify-between font-sans items-center"><span>R.off</span><input type="text" value={totals.rOff} onChange={(e) => handleTotalChange('rOff', e.target.value)} placeholder="0.00" /></div>
                                </div>
                                <div className="bg-white text-black border-y-2 border-black font-black text-sm px-2.5 py-1.5 flex justify-between items-center tracking-wide">
                                    <span className="whitespace-nowrap">Grand Total</span>
                                    <input type="text" className="font-mono text-right bg-transparent border-none outline-none w-28" value={totals.manualGrandTotal !== undefined && totals.manualGrandTotal !== '' ? totals.manualGrandTotal : (grossVal > 0 || disVal > 0 || addlVal > 0 || roffVal !== 0 || gstVal > 0 ? computedGrandTotal : '0.00')} onChange={(e) => handleTotalChange('grandTotal', e.target.value)} placeholder="0.00" />
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
























