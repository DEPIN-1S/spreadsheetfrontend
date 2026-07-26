import React, { useState } from 'react';
import { FiX, FiSave } from 'react-icons/fi';

export default function AddRetailPartyModal({ isOpen, onClose, initialData, onSave }) {
    const currentYear = new Date().getFullYear();

    const [formData, setFormData] = useState({
        name: '',
        age: '',
        dobYear: '',
        contact: '',
        email: '',
        address: ''
    });

    const [prevInitialData, setPrevInitialData] = useState(initialData);
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    if (isOpen !== prevIsOpen || initialData !== prevInitialData) {
        setPrevIsOpen(isOpen);
        setPrevInitialData(initialData);
        setErrorMessage('');
        setIsSubmitting(false);
        if (isOpen && initialData) {
            const initAge = initialData.age ? String(initialData.age) : (initialData.dobYear ? String(currentYear - Number(initialData.dobYear)) : '');
            const initDobYear = initialData.dobYear ? String(initialData.dobYear) : (initialData.age ? String(currentYear - Number(initialData.age)) : '');
            setFormData({
                name: initialData.name || '',
                age: initAge,
                dobYear: initDobYear,
                contact: initialData.contact || '',
                email: initialData.email || '',
                address: initialData.address || ''
            });
        } else if (isOpen && !initialData) {
            setFormData({ name: '', age: '', dobYear: '', contact: '', email: '', address: '' });
        }
    }

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAgeChange = (e) => {
        const val = e.target.value;
        if (val !== '' && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 120) {
            const calculatedYear = currentYear - Number(val);
            setFormData(prev => ({
                ...prev,
                age: val,
                dobYear: String(calculatedYear)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                age: val,
                dobYear: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsSubmitting(true);
        const payload = {
            ...formData,
            age: formData.age ? Number(formData.age) : null,
            dobYear: formData.dobYear ? Number(formData.dobYear) : null
        };
        try {
            if (onSave) {
                await onSave(payload);
            }
            onClose();
            setFormData({ name: '', age: '', dobYear: '', contact: '', email: '', address: '' });
        } catch (err) {
            console.error("Error saving retail party modal:", err);
            setErrorMessage(err.response?.data?.message || err.message || "Failed to save retail customer.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {initialData ? "Edit Retail Party / Customer" : "Add New Retail Party / Customer"}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {initialData ? "Update the retail customer's information." : "Enter the retail customer's information."}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                            {errorMessage}
                        </div>
                    )}
                    <form id="add-retail-party-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" 
                                    placeholder="e.g. names " 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number <span className="text-red-500">*</span></label>
                                <input 
                                    type="tel" 
                                    name="contact"
                                    required
                                    value={formData.contact}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" 
                                    placeholder="10 digit number only" 
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" 
                                    placeholder="customer@email.com (Optional)" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Age (in Years)</label>
                                <input 
                                    type="number" 
                                    name="age"
                                    min="0"
                                    max="120"
                                    value={formData.age}
                                    onChange={handleAgeChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" 
                                    placeholder="e.g. 28" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Calculated Birth Year (Auto)</label>
                                <input 
                                    type="text" 
                                    readOnly
                                    value={formData.dobYear ? `${formData.dobYear}` : ''}
                                    className="w-full px-4 py-2 border border-indigo-200 rounded-lg bg-indigo-50/50 font-bold text-indigo-700 outline-none cursor-default" 
                                    placeholder="Auto-calculated" 
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea 
                                    rows="3"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none" 
                                    placeholder="Enter full address here..." 
                                ></textarea>
                            </div>
                        </div>
                    </form>
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button 
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="add-retail-party-form"
                        disabled={isSubmitting}
                        className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/30 transition-colors disabled:opacity-50"
                    >
                        <FiSave size={16} />
                        {isSubmitting ? "Saving..." : "Save Customer"}
                    </button>
                </div>
            </div>
        </div>
    );
}
