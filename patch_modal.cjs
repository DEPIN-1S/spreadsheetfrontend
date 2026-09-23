const fs = require('fs');
const path = 'c:/jithin-pm/Work/Spreadsheet/spreadsheetfrontend/src/Components/GenerateInvoiceModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix handleItemChange block
const search1 = `        const currentItem = items.find(item => item.id === id);
        const mergedItem = { ...currentItem, ...updatedItem };

    const removeRow = (id) => {`;
    
const replace1 = `        const currentItem = items.find(item => item.id === id);
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

    const removeRow = (id) => {`;
    
if (content.includes(search1)) {
    content = content.replace(search1, replace1);
    console.log("Fixed handleItemChange block");
} else {
    console.log("Could not find handleItemChange search block");
}

// 2. Fix the broken cols.map block in the table
const search2 = `                                                <td className="border-r border-black py-1 px-1 text-center font-bold relative w-8">
                                                    <span>{index + 1}</span>
                                                    <button onClick={() => removeRow(item.id)} className="absolute right-0 top-1/2 -translate-y-1/2 text-red-400 hover:text-red-600 no-print" title="Remove Row"><FiTrash2 size={10}/></button>
                                                </td>
                                                                onChange={(e) => handleItemChange(item.id, col, e.target.value)} 
                                                                onBlur={col === 'Qty' ? (e) => handleQtyBlur(item.id, e.target.value) : undefined} `;

const replace2 = `                                                <td className="border-r border-black py-1 px-1 text-center font-bold relative w-8">
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
                                                                    <div className="absolute z-[100] bg-white border border-gray-200 shadow-xl max-h-60 overflow-y-auto w-64 top-full left-0 mt-1 rounded text-left no-print">
                                                                        {inventoryData.map((prod, idx) => (
                                                                            <div 
                                                                                key={idx} 
                                                                                className="p-2 border-b border-gray-100 hover:bg-indigo-50 cursor-pointer flex gap-2 items-center"
                                                                                onMouseDown={(e) => e.preventDefault()}
                                                                                onClick={() => {
                                                                                    handleItemChange(item.id, col, prod['Product Name']);
                                                                                    setActiveDropdownRow(null);
                                                                                }}
                                                                            >
                                                                                {prod['Image'] && (
                                                                                    <img src={prod['Image']} className="w-8 h-8 object-cover rounded bg-gray-100 flex-shrink-0" alt="" />
                                                                                )}
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="font-bold text-gray-900 truncate text-[11px] leading-tight">{prod['Product Name']}</div>
                                                                                    {prod['Composition'] && (
                                                                                        <div className="text-[9px] text-gray-500 truncate mt-0.5">{prod['Composition']}</div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                value={item[col] || ''} 
                                                                onChange={(e) => handleItemChange(item.id, col, e.target.value)} 
                                                                onBlur={col === 'Qty' ? (e) => handleQtyBlur(item.id, e.target.value) : undefined} `;

if (content.includes(search2)) {
    content = content.replace(search2, replace2);
    console.log("Fixed table mapping block");
} else {
    console.log("Could not find table mapping search block");
}

fs.writeFileSync(path, content);
