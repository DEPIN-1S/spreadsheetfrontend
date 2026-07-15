import React, { useState } from 'react';
import { FiMenu, FiArrowLeft, FiSave } from 'react-icons/fi';

export default function AddWholesaleParty({ setMobileOpen, setActivePath }) {
    const [formData, setFormData] = useState({
        name: '',
        registrationNo: '',
        contact: '',
        email: '',
        address: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Saving new party:", formData);
        // Normally, save this via API or state manager, then navigate back
        if (setActivePath) {
            setActivePath('/inventory/wholesale-parties');
        }
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
                >
                    <FiMenu size={24} />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button 
                        onClick={() => setActivePath && setActivePath('/inventory/wholesale-billing')}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Back"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900 truncate">
                        Add New Party
                    </h1>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h2 className="text-lg font-medium text-gray-900">Party Details</h2>
                            <p className="text-sm text-gray-500 mt-1">Enter the wholesale party's information below.</p>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Party Name <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        name="name"
                                        required
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" 
                                        placeholder="e.g. Acme Corp" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                                    <input 
                                        type="tel" 
                                        name="contact"
                                        value={formData.contact}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors" 
                                        placeholder="+1 (555) 000-0000" 
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
                                        placeholder="contact@company.com" 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration No. (DL / GSTIN / PAN)</label>
                                    <textarea 
                                        rows="2"
                                        name="registrationNo"
                                        value={formData.registrationNo}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors resize-none" 
                                        placeholder="e.g. GSTIN: 32AAG..., DL No: WLF20B..., REG-123456" 
                                    ></textarea>
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
                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button 
                                    type="button"
                                    onClick={() => setActivePath && setActivePath('/inventory/wholesale-parties')}
                                    className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/30 transition-colors"
                                >
                                    <FiSave size={16} />
                                    Save Party
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
