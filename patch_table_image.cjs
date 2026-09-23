const fs = require('fs');
const path = 'src/Components/GenerateInvoiceModal.jsx';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `<tbody className="divide-y divide-gray-300 text-[10px]">`;
const searchEndStr = `<tr className="no-print border-b border-black">`;

const replaceContent = `<tbody className="divide-y divide-gray-300 text-[10px]">
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
                                                                            let debugStr = '';
                                                                            if (imgSrc) {
                                                                                if (typeof imgSrc === 'object') {
                                                                                    imgSrc = imgSrc.url || imgSrc.src || '';
                                                                                    debugStr = JSON.stringify(prod['Image']);
                                                                                } else if (typeof imgSrc === 'string' && imgSrc.includes('=')) {
                                                                                    // Check if it's a formula =IMAGE("url")
                                                                                    const match = imgSrc.match(/IMAGE\\(["'](.*?)["']\\)/i);
                                                                                    if (match) imgSrc = match[1];
                                                                                }
                                                                            }
                                                                            
                                                                            return (
                                                                            <div 
                                                                                key={idx} 
                                                                                className="p-2 border-b border-gray-100 hover:bg-indigo-50 cursor-pointer flex gap-3 items-center"
                                                                                onMouseDown={(e) => e.preventDefault()}
                                                                                onClick={() => {
                                                                                    handleItemChange(item.id, col, prod['Product Name']);
                                                                                    setActiveDropdownRow(null);
                                                                                }}
                                                                            >
                                                                                {imgSrc && (
                                                                                    <img src={imgSrc} className="w-12 h-12 object-cover rounded bg-gray-100 flex-shrink-0" alt="img" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                                                                                )}
                                                                                <div style={{display:'none'}} className="text-[8px] text-red-500 w-12 break-words">Broken: {String(prod['Image']).substring(0,20)}</div>
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="font-bold text-gray-900 text-[11px] leading-tight break-words">{prod['Product Name']}</div>
                                                                                    {prod['Composition'] && (
                                                                                        <div className="text-[9px] text-gray-500 mt-0.5 whitespace-normal leading-tight break-words">{prod['Composition']}</div>
                                                                                    )}
                                                                                    {debugStr && <div className="text-[8px] text-blue-500">{debugStr}</div>}
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
                                    <tr className="no-print border-b border-black">`;

const startIdx = content.indexOf(searchStr);
const endIdx = content.indexOf(searchEndStr);

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = content.substring(0, startIdx) + replaceContent + content.substring(endIdx + searchEndStr.length);
    fs.writeFileSync(path, newContent);
    console.log("Fixed table rendering");
} else {
    console.log("Could not find start or end index");
}
