import React, { useState, useEffect } from 'react';
import { FiX, FiList, FiCheckCircle, FiDatabase, FiTrash2, FiSearch, FiFileText } from 'react-icons/fi';
import apiClient from '../api/apiClient';

export default function AddTemplateModal({ isOpen, onClose, onSave, initialData }) {
    const defaultCols = ["Product Name", "Qty", "Selling Rate", "Discount", "MRP", "GST", "Total"];
    
    const getInitialColumns = () => {
        let savedCols = [];
        if (!initialData?.columns) {
            savedCols = defaultCols;
        } else if (Array.isArray(initialData.columns)) {
            savedCols = initialData.columns;
        } else if (typeof initialData.columns === 'string') {
            try {
                let parsed = JSON.parse(initialData.columns);
                if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed); // Handle double stringified
                }
                if (Array.isArray(parsed)) {
                    savedCols = parsed;
                } else {
                    savedCols = defaultCols;
                }
            } catch (e) {
                if (initialData.columns.includes(',')) {
                    savedCols = initialData.columns.split(',').map(s => s.trim()).filter(Boolean);
                } else if (initialData.columns.trim() && !initialData.columns.startsWith('[')) {
                    savedCols = [initialData.columns.trim()];
                } else {
                    savedCols = defaultCols;
                }
            }
        }
        
        if (!Array.isArray(savedCols)) savedCols = defaultCols;
        
        // Ensure default columns are always in state so they can be shown if isProductBased is toggled ON
        return [...new Set([...defaultCols, ...savedCols])];
    };

    const getInitialSpreadsheetIds = (data) => {
        if (!data) return [];
        if (Array.isArray(data.spreadsheetIds)) return data.spreadsheetIds;
        if (typeof data.spreadsheetIds === 'string') {
            try {
                const parsed = JSON.parse(data.spreadsheetIds);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                if (data.spreadsheetIds.includes(',')) {
                    return data.spreadsheetIds.split(',').map(s => s.trim()).filter(Boolean);
                } else if (data.spreadsheetIds.trim() && !data.spreadsheetIds.startsWith('[')) {
                    return [data.spreadsheetIds.trim()];
                }
            }
        }
        if (data.spreadsheetId) return [data.spreadsheetId];
        return [];
    };

    const [isProductBased, setIsProductBased] = useState(initialData?.isProductBased ?? true);
    const [isB2B, setIsB2B] = useState(initialData?.isB2B ?? false);
    const [columns, setColumns] = useState(getInitialColumns());
    const [newColumnName, setNewColumnName] = useState("");
    const [templateName, setTemplateName] = useState(initialData?.name || "");
    const [spreadsheetIds, setSpreadsheetIds] = useState(getInitialSpreadsheetIds(initialData));
    const [sheetSearch, setSheetSearch] = useState("");
    const [sheets, setSheets] = useState([]);
    const [signatureImage, setSignatureImage] = useState(initialData?.signatureImage || null);

    useEffect(() => {
        if (isOpen) {
            apiClient.get('/sheets', { params: { limit: 1000, forInvoiceGenerator: true } }).then(res => {
                if (res.data && res.data.data) {
                    setSheets(res.data.data);
                }
            }).catch(err => console.error("Failed to fetch sheets", err));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialData) {
            setIsProductBased(initialData.isProductBased ?? true);
            setIsB2B(initialData.isB2B ?? false);
            setColumns(getInitialColumns());
            setTemplateName(initialData.name || "");
            setSpreadsheetIds(getInitialSpreadsheetIds(initialData));
            setSheetSearch("");
            setSignatureImage(initialData.signatureImage || null);
        } else if (isOpen && !initialData) {
            setIsProductBased(true);
            setIsB2B(false);
            setColumns(defaultCols);
            setTemplateName("");
            setSpreadsheetIds([]);
            setSheetSearch("");
            setSignatureImage(null);
        }
    }, [isOpen, initialData]);

    const defaultColsUpper = defaultCols.map(c => c.toUpperCase());
    const hasCustomColumn = columns.some(col => !defaultColsUpper.includes(col.toUpperCase()));
    const isSaveValid = templateName.trim().length > 0 && (isProductBased || hasCustomColumn);

    const handleAddColumn = () => {
        if (newColumnName.trim() && !columns.includes(newColumnName.trim())) {
            setColumns([...columns, newColumnName.trim()]);
            setNewColumnName("");
        }
    };

    const handleRemoveColumn = (colToRemove) => {
        setColumns(columns.filter(col => col !== colToRemove));
    };

    const handleToggleSheet = (sheetId) => {
        setSpreadsheetIds(prev => 
            prev.includes(sheetId) ? prev.filter(id => id !== sheetId) : [...prev, sheetId]
        );
    };

    const filteredSheets = sheets.filter(s => 
        !sheetSearch.trim() || (s.name && s.name.toLowerCase().includes(sheetSearch.toLowerCase()))
    );

    const handleSelectAllSheets = () => {
        const filteredSheetIds = filteredSheets.map(s => s.id);
        const allSelected = filteredSheetIds.length > 0 && filteredSheetIds.every(id => spreadsheetIds.includes(id));
        if (allSelected) {
            setSpreadsheetIds(prev => prev.filter(id => !filteredSheetIds.includes(id)));
        } else {
            setSpreadsheetIds(prev => [...new Set([...prev, ...filteredSheetIds])]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="shrink-0 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FiList size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{initialData ? "Edit Template" : "New Template"}</h2>
                            <p className="text-xs text-gray-500">Configure your invoice layout and columns</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 sm:p-8 space-y-8">
                        
                        <section className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Template Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                    placeholder="e.g. Standard Wholesale Template"
                                />
                            </div>
                        </section>

                        <hr className="border-gray-100" />

                        <section className="space-y-4">
                            <div className="flex items-center justify-between p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">B to B</h3>
                                    <p className="text-xs text-gray-500 mt-1">Enable this if this template is for Business to Business invoices.</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setIsB2B(!isB2B)}
                                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${isB2B ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                >
                                    <span 
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isB2B ? 'translate-x-5' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>
                            
                            <div className="flex flex-col p-5 bg-white border border-gray-100 shadow-sm rounded-2xl gap-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">Product-based Business</h3>
                                        <p className="text-xs text-gray-500 mt-1">Enable this if this template is for physical or digital products.</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsProductBased(!isProductBased)}
                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${isProductBased ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    >
                                        <span 
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isProductBased ? 'translate-x-5' : 'translate-x-0'}`}
                                        />
                                    </button>
                                </div>
                                
                                {isProductBased && (
                                    <div className="pt-4 border-t border-gray-100 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div>
                                                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <FiDatabase className="text-indigo-500" />
                                                    Connect Database (Spreadsheets)
                                                </label>
                                                <p className="text-xs text-gray-500 mt-0.5">Select spreadsheet files to fetch inventory details automatically.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${spreadsheetIds.length > 0 ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-gray-100 text-gray-500'}`}>
                                                    {spreadsheetIds.length} {spreadsheetIds.length === 1 ? 'sheet' : 'sheets'} selected
                                                </span>
                                                {sheets.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={handleSelectAllSheets}
                                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline px-1 py-0.5"
                                                    >
                                                        {filteredSheets.length > 0 && filteredSheets.every(s => spreadsheetIds.includes(s.id)) ? 'Deselect All' : 'Select All'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {sheets.length > 4 && (
                                            <div className="relative">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                <input 
                                                    type="text"
                                                    value={sheetSearch}
                                                    onChange={(e) => setSheetSearch(e.target.value)}
                                                    placeholder="Search spreadsheets..."
                                                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                />
                                            </div>
                                        )}

                                        <div className="max-h-52 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl bg-white shadow-inner">
                                            {sheets.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-gray-400">
                                                    No spreadsheet files found
                                                </div>
                                            ) : filteredSheets.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-gray-400">
                                                    No spreadsheets match "{sheetSearch}"
                                                </div>
                                            ) : (
                                                filteredSheets.map(sheet => {
                                                    const isChecked = spreadsheetIds.includes(sheet.id);
                                                    return (
                                                        <label 
                                                            key={sheet.id}
                                                            className={`flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
                                                                isChecked ? 'bg-indigo-50/60 text-indigo-900 font-medium' : 'hover:bg-gray-50 text-gray-700'
                                                            }`}
                                                        >
                                                            <input 
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleToggleSheet(sheet.id)}
                                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                            />
                                                            <FiFileText className={`shrink-0 ${isChecked ? 'text-indigo-600' : 'text-gray-400'}`} size={16} />
                                                            <span className="text-xs truncate flex-1">{sheet.name}</span>
                                                            {isChecked && (
                                                                <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                                                                    Connected
                                                                </span>
                                                            )}
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {/* Selected chips */}
                                        {spreadsheetIds.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {sheets.filter(s => spreadsheetIds.includes(s.id)).map(sheet => (
                                                    <span 
                                                        key={sheet.id}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-xs font-medium"
                                                    >
                                                        <FiFileText size={12} className="shrink-0" />
                                                        <span className="max-w-[150px] truncate">{sheet.name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleSheet(sheet.id)}
                                                            className="text-indigo-400 hover:text-indigo-700 transition-colors focus:outline-none"
                                                            title="Remove"
                                                        >
                                                            <FiX size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>

                        <hr className="border-gray-100" />

                        <section className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <FiList />
                                Signature
                            </h3>
                            <p className="text-xs text-gray-500">Upload an authorised signature image to appear on invoices generated with this template.</p>
                            <div className="flex items-center gap-4">
                                <label className="flex flex-col items-center justify-center w-40 h-20 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all bg-gray-50">
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => setSignatureImage(ev.target.result);
                                        reader.readAsDataURL(file);
                                    }} />
                                    {signatureImage ? (
                                        <img src={signatureImage} alt="Signature" className="w-full h-full object-contain p-1 rounded-xl" />
                                    ) : (
                                        <span className="text-xs text-gray-400 text-center px-2">Click to upload signature</span>
                                    )}
                                </label>
                                {signatureImage && (
                                    <button 
                                        type="button" 
                                        onClick={() => setSignatureImage(null)} 
                                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 border border-red-200 rounded-xl transition-all shadow-sm"
                                    >
                                        <FiTrash2 size={14} />
                                        Remove
                                    </button>
                                )}
                            </div>
                        </section>

                        <hr className="border-gray-100" />

                        <section className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                <FiList />
                                Invoice Columns
                            </h3>
                            <p className="text-xs text-gray-500">
                                These columns will be included in invoices generated using this template.
                            </p>
                            
                            <div className="flex flex-wrap gap-3 mt-4 mb-4">
                                {columns.filter(col => isProductBased || !defaultColsUpper.includes(col.toUpperCase())).map((col, idx) => {
                                    const isDefault = defaultColsUpper.includes(col.toUpperCase());
                                    return (
                                        <div key={idx} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium ${isDefault ? 'bg-teal-50 border-teal-100 text-teal-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}>
                                            <FiCheckCircle className={isDefault ? 'text-teal-500' : 'text-indigo-500'} />
                                            {col}
                                            {!isDefault && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveColumn(col)} 
                                                    className="ml-1 text-indigo-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                                    title="Remove custom column"
                                                >
                                                    <FiX size={14} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex items-center gap-3 mt-4">
                                <input 
                                    type="text" 
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddColumn())}
                                    placeholder="Custom column name..."
                                    className="flex-1 max-w-xs px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                                <button 
                                    type="button"
                                    onClick={handleAddColumn}
                                    disabled={!newColumnName.trim()}
                                    className="px-5 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-100"
                                >
                                    Add Column
                                </button>
                            </div>
                        </section>

                    </div>
                </div>

                <div className="shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            const finalColumns = isProductBased ? columns : columns.filter(col => !defaultColsUpper.includes(col.toUpperCase()));
                            onSave({ 
                                name: templateName, 
                                isProductBased, 
                                isB2B, 
                                columns: JSON.stringify(finalColumns), 
                                spreadsheetIds: JSON.stringify(spreadsheetIds), 
                                spreadsheetId: spreadsheetIds[0] || null, 
                                signatureImage 
                            });
                        }}
                        disabled={!isSaveValid}
                        className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all ${
                            isSaveValid 
                                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20' 
                                : 'bg-indigo-300 cursor-not-allowed'
                        }`}
                    >
                        {initialData ? "Update Template" : "Save Template"}
                    </button>
                </div>
            </div>
        </div>
    );
}
