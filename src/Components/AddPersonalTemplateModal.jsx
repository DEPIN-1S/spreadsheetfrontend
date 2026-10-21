import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiUpload, FiImage, FiSearch, FiCheck, FiUser } from 'react-icons/fi';

/**
 * Reusable Search & Select Combobox for Parties in Invoice Generation
 */
function PartySearchSelect({
    label,
    placeholder = 'Search party by name or detail...',
    parties = [],
    selectedPartyId,
    onSelectParty,
    onClearParty,
    onOpenCreateParty,
    details = []
}) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedParty = parties.find(p => p.id === selectedPartyId);

    // Filter parties by search query
    const filtered = parties.filter(p => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        const nameMatch = (p.name || '').toLowerCase().includes(query);
        const fieldMatch = Array.isArray(p.customFields) && p.customFields.some(f => 
            (f.key || '').toLowerCase().includes(query) || (f.value || '').toLowerCase().includes(query)
        );
        return nameMatch || fieldMatch;
    });

    useEffect(() => {
        const handleOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    return (
        <div className="space-y-2.5" ref={containerRef}>
            {selectedParty ? (
                /* Selected Party Preview Card */
                <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-2xs transition-all">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-base shrink-0">
                                {selectedParty.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-gray-900 text-sm">{selectedParty.name}</h4>
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-full border border-emerald-100">
                                        <FiCheck size={10} /> Selected
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {details.length} detail{details.length !== 1 ? 's' : ''} auto-loaded
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClearParty}
                            className="text-xs font-semibold text-gray-500 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                        >
                            Change Party
                        </button>
                    </div>

                    {/* Loaded Details Summary (Read-Only Preview) */}
                    {details.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {details.map((d, idx) => (
                                <div key={idx} className="bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 flex items-center justify-between">
                                    <span className="text-gray-400 font-medium truncate">{d.key || "Party Name"}</span>
                                    <span className="text-gray-800 font-semibold truncate ml-2">{d.value || '—'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Search & Select Combobox */
                <div className="relative">
                    <div className="relative">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder={placeholder}
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setIsOpen(true);
                            }}
                            onFocus={() => setIsOpen(true)}
                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs transition-all placeholder:text-gray-400"
                        />
                    </div>

                    {/* Dropdown Options */}
                    {isOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-gray-100 animate-in fade-in zoom-in-95">
                            {filtered.length > 0 ? (
                                filtered.map(party => (
                                    <button
                                        key={party.id}
                                        type="button"
                                        onClick={() => {
                                            onSelectParty(party.id);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-indigo-50/70 transition-colors flex items-center justify-between group"
                                    >
                                        <div className="min-w-0 pr-3">
                                            <div className="font-semibold text-sm text-gray-900 group-hover:text-indigo-700 truncate">
                                                {party.name}
                                            </div>
                                            {Array.isArray(party.customFields) && party.customFields.length > 0 && (
                                                <div className="text-[11px] text-gray-400 truncate mt-0.5">
                                                    {party.customFields.map(f => `${f.key}: ${f.value}`).join(' • ')}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs font-semibold text-indigo-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Select →
                                        </span>
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-xs text-gray-500">
                                    <p className="font-semibold text-gray-700">No parties found</p>
                                    <p className="mt-0.5 text-gray-400">
                                        {parties.length === 0 ? "No parties added yet." : `No party matching "${search}"`}
                                    </p>

                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AddPersonalTemplateModal({ isOpen, onClose, onSave, parties = [], onOpenCreateParty }) {
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [fromDetails, setFromDetails] = useState([]);
    const [toDetails, setToDetails] = useState([]);
    const [selectedFromPartyId, setSelectedFromPartyId] = useState('');
    const [selectedToPartyId, setSelectedToPartyId] = useState('');
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

    const handleSelectFromParty = (partyId) => {
        setSelectedFromPartyId(partyId);
        if (!partyId) {
            setFromDetails([]);
            return;
        }
        const party = parties.find(p => p.id === partyId);
        if (party) {
            const isInd = Boolean(party.isIndividual || party.type === 'individual');
            const fields = [];
            fields.push({ 
                key: isInd ? 'Name' : '', 
                value: party.name,
                isIndividual: isInd 
            });
            if (Array.isArray(party.customFields)) {
                party.customFields.forEach(f => {
                    if (f.key && f.key.trim()) {
                        fields.push({ key: f.key.trim(), value: f.value || '' });
                    }
                });
            }
            setFromDetails(fields);
        }
    };

    const handleSelectToParty = (partyId) => {
        setSelectedToPartyId(partyId);
        if (!partyId) {
            setToDetails([]);
            return;
        }
        const party = parties.find(p => p.id === partyId);
        if (party) {
            const isInd = Boolean(party.isIndividual || party.type === 'individual');
            const fields = [];
            fields.push({ 
                key: isInd ? 'Name' : '', 
                value: party.name,
                isIndividual: isInd 
            });
            if (Array.isArray(party.customFields)) {
                party.customFields.forEach(f => {
                    if (f.key && f.key.trim()) {
                        fields.push({ key: f.key.trim(), value: f.value || '' });
                    }
                });
            }
            setToDetails(fields);
        }
    };

    const handleAddCustomColumn = () => {
        if (newColumnName.trim()) {
            const colName = newColumnName.trim();
            const colType = newColumnType;
            setColumns(prev => [...prev, { name: colName, type: colType }]);
            if (colType === 'Currency' && !grandTotalColumn) {
                setGrandTotalColumn(colName);
            }
            setNewColumnName('');
            setNewColumnType('Text');
        }
    };

    const removeColumn = (index) => {
        setColumns(prev => {
            const removedCol = prev[index];
            const newCols = prev.filter((_, i) => i !== index);
            if (grandTotalColumn === removedCol?.name) {
                const nextCurrency = newCols.find(c => c.type === 'Currency');
                setGrandTotalColumn(nextCurrency ? nextCurrency.name : '');
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

    const hasValidFrom = !!selectedFromPartyId && fromDetails.length > 0;
    const hasValidTo = !!selectedToPartyId && toDetails.length > 0;
    const hasColumns = columns.length > 0;
    const hasCurrencyColumn = columns.some(c => c.type === 'Currency');
    const isTotalValid = hasCurrencyColumn ? !!grandTotalColumn : true;

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
                            
                            {/* Logo Upload */}
                            <div className="mb-5">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Company / Business Logo (Optional)</label>
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

                            {/* Search & Select From Party */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Select From Party <span className="text-red-500">*</span>
                                </label>
                                <PartySearchSelect
                                    label="From Party"
                                    placeholder="Search saved party by name or detail..."
                                    parties={parties}
                                    selectedPartyId={selectedFromPartyId}
                                    onSelectParty={handleSelectFromParty}
                                    onClearParty={() => {
                                        setSelectedFromPartyId('');
                                        setFromDetails([]);
                                    }}
                                    onOpenCreateParty={onOpenCreateParty}
                                    details={fromDetails}
                                />
                            </div>
                        </div>

                        {/* To Section */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Client (To) Details</h3>
                            
                            {/* Search & Select Client (To) Party */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Select Client Party <span className="text-red-500">*</span>
                                </label>
                                <PartySearchSelect
                                    label="Client (To) Party"
                                    placeholder="Search saved client by name or detail..."
                                    parties={parties}
                                    selectedPartyId={selectedToPartyId}
                                    onSelectParty={handleSelectToParty}
                                    onClearParty={() => {
                                        setSelectedToPartyId('');
                                        setToDetails([]);
                                    }}
                                    onOpenCreateParty={onOpenCreateParty}
                                    details={toDetails}
                                />
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
                                    <option value="Currency">Currency</option>
                                    <option value="Date">Date</option>
                                </select>
                                <button 
                                    type="button" 
                                    onClick={handleAddCustomColumn}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1"
                                >
                                    <FiPlus size={16} /> Add Column
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
                                <p className="text-xs text-gray-500 mb-3">Select a currency column to calculate the grand total automatically.</p>
                                <select 
                                    value={grandTotalColumn}
                                    onChange={(e) => setGrandTotalColumn(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    <option value="">None</option>
                                    {columns.filter(c => c.type === 'Currency').map((col, idx) => (
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
                        {!hasValidFrom && <p>• Select a 'From' party</p>}
                        {!hasValidTo && <p>• Select a Client ('To') party</p>}
                        {!hasColumns && <p>• Add at least one column</p>}
                        {(hasColumns && hasCurrencyColumn && !isTotalValid) && <p>• Select a Grand Total Calculating Column</p>}
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
