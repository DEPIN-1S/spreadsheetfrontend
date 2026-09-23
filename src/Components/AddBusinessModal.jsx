import React, { useState, useEffect } from 'react';
import { FiX, FiUploadCloud, FiBriefcase, FiList, FiCheckCircle, FiUsers, FiSearch, FiTrash2, FiPlus } from 'react-icons/fi';
import apiClient from '../api/apiClient';

export default function AddBusinessModal({ isOpen, onClose, onSave, initialData }) {

    const [businessName, setBusinessName] = useState(initialData?.name || "");
    const [additionalData, setAdditionalData] = useState(() => {
        if (initialData?.additionalData) {
            let parsed = typeof initialData.additionalData === 'string' 
                ? JSON.parse(initialData.additionalData) 
                : initialData.additionalData;
            return parsed.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return { key: item.key || '', value: item.value || '' };
                } else if (typeof item === 'string') {
                    const parts = item.split(':');
                    if (parts.length > 1) {
                        return { key: parts[0].trim(), value: parts.slice(1).join(':').trim() };
                    }
                    return { key: '', value: item };
                }
                return { key: '', value: '' };
            });
        }
        return [];
    });
    const [logoPreview, setLogoPreview] = useState(initialData?.logo || null);
    const [logoFile, setLogoFile] = useState(null);
    const [seals, setSeals] = useState(initialData?.seals || []);
    const [users, setUsers] = useState([]);
    const [sharedUsers, setSharedUsers] = useState([]);

    useEffect(() => {
        if (isOpen) {
            apiClient.get('/user/search?limit=100').then(res => {
                if (res.data && res.data.data) {
                    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                    // Filter out the current logged-in user
                    setUsers(res.data.data.filter(u => u.id !== currentUser.id));
                }
            }).catch(err => console.error("Failed to fetch users", err));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialData) {
            setBusinessName(initialData.name || "");
            const parsedData = typeof initialData.additionalData === 'string' 
                ? JSON.parse(initialData.additionalData) 
                : (initialData.additionalData || []);
            setAdditionalData(parsedData.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return { key: item.key || '', value: item.value || '' };
                } else if (typeof item === 'string') {
                    const parts = item.split(':');
                    if (parts.length > 1) {
                        return { key: parts[0].trim(), value: parts.slice(1).join(':').trim() };
                    }
                    return { key: '', value: item };
                }
                return { key: '', value: '' };
            }));
            setLogoPreview(initialData.logo || null);
            setLogoFile(null);
            setSeals(initialData.seals || []);
            setSharedUsers(initialData.sharedUsers?.map(u => u.id) || []);
        } else if (isOpen && !initialData) {
            setBusinessName("");
            setAdditionalData([]);
            setLogoPreview(null);
            setLogoFile(null);
            setSeals([]);
            setSharedUsers([]);
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const isSaveValid = businessName.trim().length > 0;

    const handleAddDataField = () => {
        setAdditionalData([...additionalData, { key: "", value: "" }]);
    };

    const handleDataChange = (index, field, val) => {
        const newData = [...additionalData];
        newData[index][field] = val;
        setAdditionalData(newData);
    };

    const handleRemoveData = (index) => {
        setAdditionalData(additionalData.filter((_, i) => i !== index));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Logo file is too large. Please select an image under 2MB.");
                return;
            }
            setLogoFile(file);
            const objectUrl = URL.createObjectURL(file);
            setLogoPreview(objectUrl);
        }
    };

    const handleAddSeals = (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        files.forEach(file => {
            if (file.size > 2 * 1024 * 1024) {
                alert("A seal file is too large. Please select images under 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                setSeals(prev => [...prev, ev.target.result]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = null;
    };

    const handleRemoveSeal = (index) => {
        setSeals(seals.filter((_, i) => i !== index));
    };

    const toggleUserShare = (userId) => {
        if (sharedUsers.includes(userId)) {
            setSharedUsers(sharedUsers.filter(id => id !== userId));
        } else {
            setSharedUsers([...sharedUsers, userId]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="relative shrink-0 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FiBriefcase size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{initialData ? "Edit Business" : "Add New Business"}</h2>
                            <p className="text-xs text-gray-500">Configure your business profile</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="relative flex-1 p-6 sm:p-8 overflow-y-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        
                        <div className="space-y-8">
                            <div className="space-y-5 border p-5 rounded-2xl bg-gray-50">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                        placeholder="e.g. Acme Corporation"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Logo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-white overflow-hidden shrink-0 group relative transition-colors hover:border-indigo-500">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <FiUploadCloud className="text-gray-300 group-hover:text-indigo-400 transition-colors" size={24} />
                                            )}
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-700">Upload your logo</p>
                                            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB. Highly recommended for professional invoices.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4 border p-5 rounded-2xl bg-gray-50">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Seals / Signatures</label>
                                    <div className="flex flex-wrap gap-3">
                                        {seals.map((seal, idx) => (
                                            <div key={idx} className="relative w-20 h-20 rounded-xl border border-gray-200 bg-white shadow-sm flex items-center justify-center group overflow-hidden">
                                                <img src={seal} alt={`Seal ${idx + 1}`} className="w-full h-full object-contain p-1" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button 
                                                        onClick={() => handleRemoveSeal(idx)}
                                                        className="p-1.5 bg-white text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center bg-white hover:border-indigo-500 hover:bg-indigo-50/50 cursor-pointer transition-all">
                                            <FiPlus className="text-gray-400" size={20} />
                                            <span className="text-[10px] text-gray-500 font-medium mt-1">Add Seal</span>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                multiple
                                                onChange={handleAddSeals}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Upload multiple stamps, signatures or other seals to use later.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900">Additional Data</h3>
                                        <p className="text-xs text-gray-500">Add dynamic fields like GSTIN, Address, etc.</p>
                                    </div>
                                    <button 
                                        onClick={handleAddDataField}
                                        className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                                    >
                                        + Add Field
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {additionalData.map((data, index) => (
                                        <div key={index} className="flex gap-2 items-start">
                                            <div className="flex-1 flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={data.key}
                                                    onChange={(e) => handleDataChange(index, 'key', e.target.value)}
                                                    placeholder="Key (e.g. GSTIN)"
                                                    className="w-1/3 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={data.value}
                                                    onChange={(e) => handleDataChange(index, 'value', e.target.value)}
                                                    placeholder="Value (e.g. 29ABCDE1234F1Z5)"
                                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50 focus:bg-white"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveData(index)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {additionalData.length === 0 && (
                                        <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50 text-xs text-gray-500">
                                            No additional fields added.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Share With Section */}
                        <div className="flex flex-col border border-gray-200 rounded-2xl overflow-hidden h-[400px] lg:h-auto">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <div className="flex items-center gap-2 mb-1">
                                    <FiUsers className="text-indigo-600" />
                                    <h3 className="text-sm font-bold text-gray-900">Share Business</h3>
                                </div>
                                <p className="text-xs text-gray-500">Select users who can access and manage this business.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 bg-white">
                                {users.length === 0 ? (
                                    <div className="flex items-center justify-center h-full text-xs text-gray-500">
                                        Loading users...
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {users.map(user => (
                                            <div 
                                                key={user.id}
                                                onClick={() => toggleUserShare(user.id)}
                                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border border-transparent ${
                                                    sharedUsers.includes(user.id) 
                                                        ? 'bg-indigo-50 border-indigo-100' 
                                                        : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        sharedUsers.includes(user.id) ? 'bg-indigo-200 text-indigo-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                                                    </div>
                                                </div>
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                                                    sharedUsers.includes(user.id)
                                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                                        : 'border-gray-300 bg-white text-transparent'
                                                }`}>
                                                    <FiCheckCircle size={14} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="relative shrink-0 p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {sharedUsers.length > 0 ? `Shared with ${sharedUsers.length} user(s)` : 'Not shared with anyone'}
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                const cleanedData = additionalData
                                    .filter(d => (d.key && d.key.trim()) || (d.value && d.value.trim()))
                                    .map(d => ({ key: d.key.trim(), value: d.value.trim() }));
                                onSave({ 
                                    name: businessName, 
                                    logo: logoFile, 
                                    additionalData: cleanedData,
                                    sharedUsers: sharedUsers,
                                    seals: seals
                                });
                            }}
                            disabled={!isSaveValid}
                            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all flex items-center gap-2 ${
                                isSaveValid 
                                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20' 
                                    : 'bg-indigo-300 cursor-not-allowed'
                            }`}
                        >
                            {initialData ? "Update Business" : "Save Business"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
