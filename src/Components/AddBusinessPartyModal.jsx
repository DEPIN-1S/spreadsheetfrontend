import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiPlus, FiTrash2, FiUsers, FiAlertCircle } from 'react-icons/fi';

const parseAdditionalData = (raw) => {
    if (!raw) return [];
    let parsed = raw;
    if (typeof raw === 'string') {
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            parsed = [raw];
        }
    }
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => {
        if (typeof item === 'object' && item !== null) {
            return {
                key: item.key || '',
                value: item.value !== undefined ? String(item.value) : ''
            };
        }
        if (typeof item === 'string') {
            if (item.includes(':')) {
                const idx = item.indexOf(':');
                return {
                    key: item.substring(0, idx).trim(),
                    value: item.substring(idx + 1).trim()
                };
            }
            return { key: '', value: item.trim() };
        }
        return { key: '', value: String(item || '') };
    });
};

export default function AddBusinessPartyModal({ isOpen, onClose, onSave, initialData }) {
    const [name, setName] = useState("");
    const [contact, setContact] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [additionalData, setAdditionalData] = useState([]);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && initialData) {
            setName(initialData.name || "");
            setContact(initialData.contact || "");
            setAge(initialData.age ? String(initialData.age) : "");
            setGender(initialData.gender || "");
            setAdditionalData(parseAdditionalData(initialData.additionalData));
            setErrors({});
            setServerError("");
            setIsSubmitting(false);
        } else if (isOpen && !initialData) {
            setName("");
            setContact("");
            setAge("");
            setGender("");
            setAdditionalData([]);
            setErrors({});
            setServerError("");
            setIsSubmitting(false);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors = {};

        // Party Name validation
        const trimmedName = name.trim();
        if (!trimmedName) {
            newErrors.name = "Party name is required";
        } else if (trimmedName.length < 2) {
            newErrors.name = "Party name must be at least 2 characters";
        } else if (trimmedName.length > 100) {
            newErrors.name = "Party name cannot exceed 100 characters";
        }

        // Contact Number validation
        const trimmedContact = contact.trim();
        const digits = trimmedContact.replace(/\D/g, '');
        if (!trimmedContact) {
            newErrors.contact = "Contact number is required";
        } else if (digits.length < 10) {
            newErrors.contact = "Contact number must contain at least 10 digits";
        } else if (digits.length > 15) {
            newErrors.contact = "Contact number cannot exceed 15 digits";
        }

        // Age validation (optional)
        if (age && age.trim()) {
            const a = age.trim();
            if (a === '.' || a === '0.' || a === '0') {
                newErrors.age = "Please enter a valid age (e.g. 25, or .8 for under 1 year)";
            } else if (/^(\.|0\.)\d+$/.test(a)) {
                // Valid decimal for under 1 year
            } else if (/^[1-9]\d*$/.test(a)) {
                if (Number(a) > 150) {
                    newErrors.age = "Age cannot exceed 150 years";
                }
            } else {
                newErrors.age = "Invalid age. Whole numbers for ≥1 yr, decimals (e.g. .8) for <1 yr";
            }
        }

        // Additional Information validation (key vs value pair consistency)
        for (let i = 0; i < additionalData.length; i++) {
            const k = (additionalData[i].key || '').trim();
            const v = (additionalData[i].value || '').trim();
            if (k && !v) {
                newErrors.additionalData = `Please enter a value for "${k}" in row ${i + 1}`;
                break;
            }
            if (!k && v) {
                newErrors.additionalData = `Please enter a label/key for "${v}" in row ${i + 1}`;
                break;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError("");

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        // Clean up empty fields (keep if both key and value have content)
        const cleanedData = additionalData
            .map(d => ({ key: (d.key || '').trim(), value: (d.value || '').trim() }))
            .filter(d => d.key !== "" && d.value !== "");
        
        try {
            await onSave({
                ...(initialData?.id ? { id: initialData.id } : {}),
                name: name.trim(),
                contact: contact.trim(),
                age: (age && age !== '.' && age !== '0.' && age !== '0') ? String(age).trim() : null,
                gender: gender || null,
                additionalData: cleanedData
            });
            onClose();
        } catch (error) {
            console.error("Save Party Error:", error);
            setServerError(error?.response?.data?.message || error?.message || "Failed to save party. Please try again.");
            setIsSubmitting(false);
        }
    };

    const handleAddDataField = () => {
        setAdditionalData(prev => [...prev, { key: '', value: '' }]);
        if (errors.additionalData) setErrors(prev => ({ ...prev, additionalData: '' }));
    };

    const handleDataChange = (index, field, val) => {
        setAdditionalData(prev => {
            const newData = [...prev];
            newData[index] = { ...newData[index], [field]: val };
            return newData;
        });
        if (errors.additionalData) setErrors(prev => ({ ...prev, additionalData: '' }));
    };

    const handleRemoveData = (index) => {
        setAdditionalData(prev => prev.filter((_, i) => i !== index));
        if (errors.additionalData) setErrors(prev => ({ ...prev, additionalData: '' }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="relative shrink-0 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FiUsers size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{initialData ? "Edit Party" : "Add New Party"}</h2>
                            <p className="text-xs text-gray-500">Enter the party's information</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} noValidate className="p-6 flex-1 overflow-y-auto">
                    <div className="space-y-5">

                        {serverError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-600">
                                <FiAlertCircle size={16} className="shrink-0 text-red-500" />
                                <span className="flex-1">{serverError}</span>
                                <button type="button" onClick={() => setServerError('')} className="p-1 hover:bg-red-100 rounded">
                                    <FiX size={14} />
                                </button>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Party Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm ${
                                        errors.name 
                                            ? "border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400/20 focus:border-red-500" 
                                            : "border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    }`}
                                    placeholder="Enter party name"
                                    required
                                />
                                {errors.name && (
                                    <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                                        <FiAlertCircle size={12} /> {errors.name}
                                    </p>
                                )}
                            </div>
                            
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Contact Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={contact}
                                    onChange={(e) => {
                                        setContact(e.target.value);
                                        if (errors.contact) setErrors(prev => ({ ...prev, contact: '' }));
                                    }}
                                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm ${
                                        errors.contact 
                                            ? "border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400/20 focus:border-red-500" 
                                            : "border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    }`}
                                    placeholder="Phone/Mobile (10 digits)"
                                    required
                                />
                                {errors.contact && (
                                    <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                                        <FiAlertCircle size={12} /> {errors.contact}
                                    </p>
                                )}
                            </div>

                            {/* Optional Age & Gender */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Age <span className="text-xs text-gray-400 font-normal">(Years, or .2 for &lt;1 yr)</span>
                                </label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={age}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || val === '.' || val === '0') {
                                            setAge(val);
                                            if (errors.age) setErrors(prev => ({ ...prev, age: '' }));
                                            return;
                                        }
                                        // Only allow decimal for age below 1 year (e.g. .2, 0.4)
                                        if (/^(\.|0\.)\d+$/.test(val)) {
                                            setAge(val);
                                            if (errors.age) setErrors(prev => ({ ...prev, age: '' }));
                                            return;
                                        }
                                        // Whole numbers only for 1 and above (no decimals allowed)
                                        if (/^[1-9]\d*$/.test(val) && Number(val) <= 150) {
                                            setAge(val);
                                            if (errors.age) setErrors(prev => ({ ...prev, age: '' }));
                                            return;
                                        }
                                    }}
                                    onBlur={() => {
                                        if (age === '.' || age === '0.' || age === '0') {
                                            setAge('');
                                        }
                                    }}
                                    className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-all text-sm ${
                                        errors.age 
                                            ? "border-red-400 bg-red-50/20 focus:ring-2 focus:ring-red-400/20 focus:border-red-500" 
                                            : "border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    }`}
                                    placeholder="e.g. 28 or .2 (<1 yr)"
                                />
                                {errors.age && (
                                    <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">
                                        <FiAlertCircle size={12} /> {errors.age}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Gender <span className="text-xs text-gray-400 font-normal">(Optional)</span>
                                </label>
                                <select
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50 focus:bg-white text-sm text-gray-700 cursor-pointer"
                                >
                                    <option value="">Select Gender (Optional)</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-700">Additional Information</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Add extra details as key-value pairs (e.g. GSTIN, DL No, Address)</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleAddDataField}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100 shadow-sm"
                                >
                                    <FiPlus size={14} /> Add Field
                                </button>
                            </div>

                            {errors.additionalData && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                                    <FiAlertCircle size={14} className="shrink-0" />
                                    <span>{errors.additionalData}</span>
                                </div>
                            )}

                            {additionalData.length > 0 && (
                                <div className="flex items-center gap-2.5 px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                    <div className="w-1/3 min-w-[130px]">Key / Label</div>
                                    <div className="flex-1">Value</div>
                                    <div className="w-8 shrink-0"></div>
                                </div>
                            )}

                            <div className="space-y-2.5">
                                {additionalData.map((data, index) => (
                                    <div key={index} className="flex items-center gap-2 bg-gray-50/70 p-2 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                        <div className="w-1/3 min-w-[130px]">
                                            <input 
                                                type="text" 
                                                value={data.key}
                                                onChange={(e) => handleDataChange(index, 'key', e.target.value)}
                                                placeholder="e.g. GSTIN, DL No"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                            />
                                        </div>
                                        <span className="text-gray-400 font-bold">:</span>
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                value={data.value}
                                                onChange={(e) => handleDataChange(index, 'value', e.target.value)}
                                                placeholder="Enter value"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                            />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveData(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            title="Remove field"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {additionalData.length === 0 && (
                                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-500">
                                        No additional fields added yet. Click &quot;+ Add Field&quot; to add key-value pairs.
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                    
                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            {isSubmitting ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <FiCheck size={18} />
                                    <span>{initialData ? 'Update Party' : 'Save Party'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
