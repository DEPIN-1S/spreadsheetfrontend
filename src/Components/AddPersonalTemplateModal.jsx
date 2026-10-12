import React, { useState } from 'react';
import { FiX, FiPlus, FiTrash2, FiUpload, FiImage } from 'react-icons/fi';

export default function AddPersonalTemplateModal({ isOpen, onClose, onSave }) {
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [fromDetails, setFromDetails] = useState([{ key: 'Name', value: '' }, { key: 'Email', value: '' }]);
    const [toDetails, setToDetails] = useState([{ key: 'Client Name', value: '' }]);
    const [paymentModes, setPaymentModes] = useState({ cash: false, upi: false, bank: false });
    const [columns, setColumns] = useState([]);
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnType, setNewColumnType] = useState('Text');
    const [grandTotalColumn, setGrandTotalColumn] = useState('');
    const [enableGst, setEnableGst] = useState(false);
    const [gstType, setGstType] = useState('exclusive');

    if (!isOpen) return null;

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const addDetail = (setter) => {
        setter(prev => [...prev, { key: '', value: '' }]);
    };

    const updateDetail = (setter, index, field, value) => {
        setter(prev => {
            const newArr = [...prev];
            newArr[index][field] = value;
            return newArr;
        });
    };

    const removeDetail = (setter, index) => {
        setter(prev => prev.filter((_, i) => i !== index));
    };

    const handleAddCustomColumn = () => {
        if (newColumnName.trim()) {
            setColumns(prev => [...prev, { name: newColumnName.trim(), type: newColumnType }]);
            setNewColumnName('');
            setNewColumnType('Text');
        }
    };

    const removeColumn = (index) => {
        setColumns(prev => {
            const newCols = prev.filter((_, i) => i !== index);
            // reset grand total column if the selected one was removed
            if (grandTotalColumn === prev[index].name) {
                setGrandTotalColumn('');
            }
            return newCols;
        });
    };

    const handleGstToggle = (e) => {
        const isChecked = e.target.checked;
        setEnableGst(isChecked);
        
        if (isChecked) {
            setColumns(prev => {
                if (!prev.find(c => c.name.toLowerCase().includes('gst'))) {
                    return [...prev, { name: 'GST %', type: 'Number' }];
                }
                return prev;
            });
        } else {
            setColumns(prev => prev.filter(c => !c.name.toLowerCase().includes('gst')));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            logo: logoPreview,
            fromDetails,
            toDetails,
            paymentModes,
            columns,
            grandTotalColumn,
            enableGst,
            gstType
        });
    };

    const hasValidFrom = fromDetails.some(d => d.key.trim() !== '' && d.value.trim() !== '');
    const hasValidTo = toDetails.some(d => d.key.trim() !== '' && d.value.trim() !== '');
    const hasColumns = columns.length > 0;
    const hasNumberColumn = columns.some(c => c.type === 'Number');
    const isTotalValid = hasNumberColumn ? !!grandTotalColumn : true;

    const isFormValid = hasValidFrom && hasValidTo && hasColumns && isTotalValid;


    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">Configure Invoice Details</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
                        <FiX size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="personal-template-form" onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* From Section */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">From Details</h3>
                            
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-20 h-20 bg-white border border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden relative group">
                                        {logoPreview ? (
                                            <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                                        ) : (
                                            <FiImage className="w-6 h-6 text-gray-400" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <FiUpload className="text-white w-5 h-5" />
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Click to upload logo<br/>(Optional)
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700">Fields</label>
                                {fromDetails.map((detail, index) => (
                                    <div key={index} className="flex gap-3 items-center">
                                        <input 
                                            type="text" 
                                            placeholder="Key (e.g. Name)" 
                                            value={detail.key}
                                            readOnly={index === 0}
                                            onChange={(e) => updateDetail(setFromDetails, index, 'key', e.target.value)}
                                            className={`w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-sm ${index === 0 ? 'bg-gray-100 font-semibold text-gray-700 cursor-not-allowed' : ''}`}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Value" 
                                            value={detail.value}
                                            onChange={(e) => updateDetail(setFromDetails, index, 'value', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button type="button" onClick={() => removeDetail(setFromDetails, index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addDetail(setFromDetails)} className="text-sm text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-700">
                                    <FiPlus size={16} /> Add Field
                                </button>
                            </div>
                        </div>

                        {/* To Section */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Client (To) Details</h3>
                            <div className="space-y-3">
                                {toDetails.map((detail, index) => (
                                    <div key={index} className="flex gap-3 items-center">
                                        <input 
                                            type="text" 
                                            placeholder="Key (e.g. Client Name)" 
                                            value={detail.key}
                                            readOnly={index === 0}
                                            onChange={(e) => updateDetail(setToDetails, index, 'key', e.target.value)}
                                            className={`w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-sm ${index === 0 ? 'bg-gray-100 font-semibold text-gray-700 cursor-not-allowed' : ''}`}
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Placeholder / Default Value" 
                                            value={detail.value}
                                            onChange={(e) => updateDetail(setToDetails, index, 'value', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button type="button" onClick={() => removeDetail(setToDetails, index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                            <FiTrash2 />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addDetail(setToDetails)} className="text-sm text-indigo-600 font-semibold flex items-center gap-1 hover:text-indigo-700">
                                    <FiPlus size={16} /> Add Field
                                </button>
                            </div>
                        </div>

                        {/* Invoice Columns Section */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-2">Invoice Columns</h3>
                            <p className="text-sm text-gray-500 mb-4">These columns will be included in personal invoices generated using this template.</p>
                            
                            <div className="flex gap-3 mb-6 items-center">
                                <input 
                                    type="text" 
                                    placeholder="Custom column name..." 
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                                <select 
                                    value={newColumnType}
                                    onChange={(e) => setNewColumnType(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    <option value="Text">Text</option>
                                    <option value="Number">Number</option>
                                    <option value="Date">Date</option>
                                </select>
                                <button 
                                    type="button" 
                                    onClick={handleAddCustomColumn} 
                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-100 transition-colors text-sm"
                                >
                                    Add Column
                                </button>
                            </div>

                            <div className="space-y-2 mb-6">
                                {columns.map((col, index) => (
                                    <div key={index} className="flex justify-between items-center bg-white border border-gray-200 px-4 py-2 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-gray-800 text-sm">{col.name}</span>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded uppercase">{col.type}</span>
                                        </div>
                                        <button type="button" onClick={() => removeColumn(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {columns.length === 0 && (
                                    <div className="text-center py-4 text-sm text-gray-400">No columns added yet.</div>
                                )}
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                                <h4 className="text-sm font-bold text-gray-800 mb-1 uppercase tracking-wider">Grand Total Of</h4>
                                <p className="text-xs text-gray-500 mb-3">Select a numeric column to calculate the grand total automatically.</p>
                                <select 
                                    value={grandTotalColumn}
                                    onChange={(e) => setGrandTotalColumn(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    <option value="">None</option>
                                    {columns.filter(c => c.type === 'Number').map((col, idx) => (
                                        <option key={idx} value={col.name}>{col.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* GST Config */}
                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">GST Calculation</h4>
                                        <p className="text-xs text-gray-500">Enable GST % column and automatic calculations.</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={enableGst} onChange={handleGstToggle} />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                                {enableGst && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs text-gray-500 mb-2 font-medium">Calculation Method</p>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                <input type="radio" name="gstType" value="inclusive" checked={gstType === 'inclusive'} onChange={() => setGstType('inclusive')} className="text-indigo-600 focus:ring-indigo-500" />
                                                <span>Inclusive (Included in Total)</span>
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                <input type="radio" name="gstType" value="exclusive" checked={gstType === 'exclusive'} onChange={() => setGstType('exclusive')} className="text-indigo-600 focus:ring-indigo-500" />
                                                <span>Exclusive (Added to Total)</span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payment Modes */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Payment Modes</h3>
                            <div className="flex gap-6">
                                {['Cash', 'UPI', 'Bank Transfer'].map((mode) => (
                                    <label key={mode} className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={paymentModes[mode.toLowerCase().split(' ')[0]]}
                                            onChange={(e) => setPaymentModes(prev => ({...prev, [mode.toLowerCase().split(' ')[0]]: e.target.checked}))}
                                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                        />
                                        {mode}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-4">
                    <div className="text-xs text-red-500 font-medium">
                        {!hasValidFrom && <p>• Add at least one valid 'From' detail</p>}
                        {!hasValidTo && <p>• Add at least one valid 'To' detail</p>}
                        {!hasColumns && <p>• Add at least one column</p>}
                        {(hasColumns && hasNumberColumn && !isTotalValid) && <p>• Select a Grand Total Calculating Column</p>}
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            form="personal-template-form" 
                            disabled={!isFormValid}
                            className={`px-5 py-2 text-sm font-bold text-white rounded-lg transition-all shadow-lg ${isFormValid ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-gray-400 cursor-not-allowed shadow-none'}`}
                        >
                            Generate Invoice
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
