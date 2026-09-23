const fs = require('fs');
const content = fs.readFileSync('src/Components/GenerateInvoiceModal.jsx', 'utf8');

const fix = `    const handleItemChange = (id, field, value) => {
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
    };`;

const startIdx = content.indexOf('    const handleItemChange = (id, field, value) => {');
const endIdx = content.indexOf('    const handleTotalChange = (field, value) => {');

const newContent = content.substring(0, startIdx) + fix + '\n\n' + content.substring(endIdx);
fs.writeFileSync('src/Components/GenerateInvoiceModal.jsx', newContent);
console.log('Fixed');
