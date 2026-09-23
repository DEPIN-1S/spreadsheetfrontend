const fs = require('fs');
const path = 'src/Components/GenerateInvoiceModal.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add previewProduct state
if (!content.includes('const [previewProduct, setPreviewProduct] = useState(null);')) {
    content = content.replace(
        'const [activeDropdownRow, setActiveDropdownRow] = useState(null);',
        'const [activeDropdownRow, setActiveDropdownRow] = useState(null);\n    const [previewProduct, setPreviewProduct] = useState(null);'
    );
}

// 2. Add onClick to image
const imgSearchStr = `<img src={imgSrc} className="w-12 h-12 object-cover rounded bg-gray-100 flex-shrink-0" alt="img" onError={(e) => { `;
const imgReplaceStr = `<img src={imgSrc} onClick={(e) => { e.stopPropagation(); setPreviewProduct({ ...prod, _resolvedImgSrc: imgSrc }); }} className="w-12 h-12 object-cover rounded bg-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity" alt="img" onError={(e) => { `;
if (content.includes(imgSearchStr)) {
    content = content.replace(imgSearchStr, imgReplaceStr);
}

// 3. Add modal rendering at the end of the component
const returnStr = `        </div>
    );
}`;

const modalMarkup = `
            {/* Image Preview Modal */}
            {previewProduct && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800 text-lg">Product Details</h3>
                            <button onClick={() => setPreviewProduct(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="w-full aspect-video bg-gray-50 rounded-xl overflow-hidden mb-5 border border-gray-100">
                                <img 
                                    src={previewProduct._resolvedImgSrc} 
                                    alt={previewProduct['Product Name']} 
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                        if (!e.target.dataset.retried && e.target.src.includes('localhost')) {
                                            e.target.dataset.retried = 'true';
                                            e.target.src = e.target.src.replace(/http:\\/\\/localhost:\\d+/, 'https://apis.datsheets.in');
                                        }
                                    }}
                                />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 mb-2">{previewProduct['Product Name']}</h4>
                            {previewProduct['Composition'] && (
                                <div className="text-sm text-gray-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100/50">
                                    <span className="font-semibold text-indigo-900 block mb-1">Composition:</span>
                                    {previewProduct['Composition']}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}`;

if (content.includes(returnStr)) {
    content = content.replace(returnStr, modalMarkup);
}

fs.writeFileSync(path, content);
console.log('Added preview modal');
