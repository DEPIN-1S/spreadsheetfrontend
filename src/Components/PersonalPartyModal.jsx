import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiUser, FiTag } from 'react-icons/fi';

export default function PersonalPartyModal({ isOpen, onClose, onSave, party = null, businessName = '' }) {
    const [name, setName] = useState('');
    const [isIndividual, setIsIndividual] = useState(false);
    const [customFields, setCustomFields] = useState([{ key: '', value: '' }]);
    const [error, setError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (party) {
                setName(party.name || '');
                setIsIndividual(Boolean(party.isIndividual || party.type === 'individual'));
                const fields = Array.isArray(party.customFields) && party.customFields.length > 0
                    ? party.customFields.map(f => ({ key: f.key || '', value: f.value || '' }))
                    : [{ key: '', value: '' }];
                setCustomFields(fields);
            } else {
                setName('');
                setIsIndividual(false);
                setCustomFields([{ key: '', value: '' }]);
            }
            setError('');
            setIsSaving(false);
        }
    }, [isOpen, party]);

    if (!isOpen) return null;

    const handleAddField = () => {
        setCustomFields(prev => [...prev, { key: '', value: '' }]);
    };

    const handleUpdateField = (index, field, value) => {
        setCustomFields(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleRemoveField = (index) => {
        setCustomFields(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!name.trim()) {
            setError('Please enter a party name');
            return;
        }

        // Filter out empty rows
        const cleanedFields = customFields
            .map(f => ({ key: f.key.trim(), value: f.value.trim() }))
            .filter(f => f.key !== '' || f.value !== '');

        setIsSaving(true);
        try {
            await onSave({
                name: name.trim(),
                type: isIndividual ? 'individual' : 'party',
                isIndividual: Boolean(isIndividual),
                customFields: cleanedFields
            });
            onClose();
        } catch (err) {
            console.error('Failed to save party:', err);
            setError(err.response?.data?.message || err.message || 'Failed to save party');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <FiUser size={18} />
                            </span>
                            <span>{party ? 'Edit Party' : 'Create New Party'}</span>
                        </h2>
                        {businessName && (
                            <p className="text-xs text-gray-500 mt-0.5 ml-10">
                                in <span className="font-semibold text-gray-700">{businessName}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
                        title="Close"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                            {error}
                        </div>
                    )}

                    <form id="party-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Individual Toggle */}
                        <div className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-xl transition-all">
                            <div>
                                <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                                    Individual
                                </label>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Toggle on if this party is an individual person (displays "Name :" on invoices).
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={isIndividual} 
                                    onChange={(e) => setIsIndividual(e.target.checked)} 
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-hidden peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {/* Party Name */}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                Party Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder={isIndividual ? "e.g. John Doe, Jane Smith" : "e.g. Acme Corporation, John Doe, SkyTech LLC"}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                                required
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                            />
                        </div>

                        {/* Custom Fields Section */}
                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-gray-200 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                        <FiTag className="text-indigo-600" size={15} />
                                        <span>Custom Details (Key & Value)</span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Add any custom keys and values for this party.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddField}
                                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                                >
                                    <FiPlus size={14} />
                                    <span>Add Field</span>
                                </button>
                            </div>

                            {/* Dynamic Fields List */}
                            <div className="space-y-2.5 pt-1">
                                {customFields.length === 0 ? (
                                    <div className="text-center py-6 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl bg-white">
                                        No custom fields added. Click "Add Field" to add one.
                                    </div>
                                ) : (
                                    customFields.map((field, idx) => (
                                        <div key={idx} className="flex items-center gap-2.5">
                                            <input
                                                type="text"
                                                placeholder="Key Name"
                                                value={field.key}
                                                onChange={(e) => handleUpdateField(idx, 'key', e.target.value)}
                                                className="w-2/5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Value"
                                                value={field.value}
                                                onChange={(e) => handleUpdateField(idx, 'value', e.target.value)}
                                                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveField(idx)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                                title="Delete Field"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="party-form"
                        disabled={isSaving}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                        {isSaving ? 'Saving...' : party ? 'Update Party' : 'Create Party'}
                    </button>
                </div>

            </div>
        </div>
    );
}
