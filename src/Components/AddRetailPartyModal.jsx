import React, { useState, useEffect } from 'react';
import { FiX, FiSave } from 'react-icons/fi';

export default function AddRetailPartyModal({ isOpen, onClose, initialData, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        if (isOpen && initialData) {
            setFormData(initialData);
        } else if (isOpen && !initialData) {
            setFormData({ name: '', contact: '', email: '', address: '' });
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Saving new retail party from modal:", formData);
        if (onSave) {
            onSave(formData);
        }
        onClose();
        // Reset form
        setFormData({ name: '', contact: '', email: '', address: '' });
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
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                    <form id="add-retail-party-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer / Party Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" 
                                    placeholder="e.g. John Doe / City Pharmacy" 
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
                                    placeholder="+1 (555) 000-0000" 
                                />
                            </div>
                            <div>
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
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit"
                        form="add-retail-party-form"
                        className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/30 transition-colors"
                    >
                        <FiSave size={16} />
                        Save Customer
                    </button>
                </div>
            </div>
        </div>
    );
}
