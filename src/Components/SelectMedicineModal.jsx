import React, { useState } from 'react';
import { FiX, FiSearch, FiPlus, FiCheck, FiPackage } from 'react-icons/fi';

const mockMedicines = [
    { id: 1, name: 'Dolo 650mg Tablet (Strip of 15)', category: 'Antipyretic', stock: 450, price: 30.50, batch: 'DL2026A', expiry: '08/2028' },
    { id: 2, name: 'Azithromycin 500mg Tablet (Strip of 5)', category: 'Antibiotic', stock: 180, price: 115.00, batch: 'AZ9981B', expiry: '11/2027' },
    { id: 3, name: 'Pantoprazole 40mg Tablet (Strip of 15)', category: 'Antacid', stock: 320, price: 85.00, batch: 'PN4412C', expiry: '05/2028' },
    { id: 4, name: 'Amoxicillin 500mg Capsule (Strip of 10)', category: 'Antibiotic', stock: 210, price: 95.00, batch: 'AM8871A', expiry: '02/2028' },
    { id: 5, name: 'Cetirizine 10mg Tablet (Strip of 10)', category: 'Antihistamine', stock: 500, price: 22.00, batch: 'CT3321D', expiry: '12/2028' },
    { id: 6, name: 'Metformin 500mg Tablet (Strip of 20)', category: 'Antidiabetic', stock: 600, price: 45.00, batch: 'MF1122E', expiry: '09/2027' },
    { id: 7, name: 'Atorvastatin 10mg Tablet (Strip of 15)', category: 'Statin', stock: 280, price: 110.00, batch: 'AT5543A', expiry: '04/2028' },
    { id: 8, name: 'Benadryl Cough Syrup (100ml Bottle)', category: 'Cough & Cold', stock: 150, price: 135.00, batch: 'BN7765B', expiry: '10/2027' },
    { id: 9, name: 'Limcee Vitamin C 500mg (Strip of 15)', category: 'Supplement', stock: 400, price: 40.00, batch: 'LM9900C', expiry: '06/2029' },
    { id: 10, name: 'Shelcal 500mg Tablet (Strip of 15)', category: 'Calcium Supplement', stock: 350, price: 120.00, batch: 'SH4432D', expiry: '03/2028' },
    { id: 11, name: 'Montair LC Tablet (Strip of 10)', category: 'Antihistamine', stock: 240, price: 180.00, batch: 'ML8811A', expiry: '01/2028' },
    { id: 12, name: 'Allegra 120mg Tablet (Strip of 10)', category: 'Antihistamine', stock: 190, price: 210.00, batch: 'AL2233B', expiry: '07/2028' },
];

export default function SelectMedicineModal({ isOpen, onClose, onSelect, existingItemNames = [], inventoryType = 'wholesale' }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    if (!isOpen) return null;

    const categories = ['All', ...new Set(mockMedicines.map(m => m.category))];

    const filteredMedicines = mockMedicines.filter(med => {
        const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              med.batch.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              med.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <FiPackage size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Select Medicine Item</h2>
                            <p className="text-xs text-gray-500">Search and pick from available {inventoryType} inventory</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Search & Filter Bar */}
                <div className="p-6 pb-4 border-b border-gray-100 space-y-3 bg-white">
                    <div className="relative">
                        <FiSearch className="absolute left-3.5 top-3 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search medicine by name, category or batch number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Category pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                                    selectedCategory === cat
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Medicine List Table */}
                <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="border border-gray-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[850px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold sticky top-0 bg-gray-50 z-10">
                                    <th className="px-4 py-3">Medicine Name</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Batch No.</th>
                                    <th className="px-4 py-3">Expiry Date</th>
                                    <th className="px-4 py-3 text-right">Stock</th>
                                    <th className="px-4 py-3 text-right">Unit Price</th>
                                    <th className="px-4 py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                                {filteredMedicines.map(med => {
                                    const isAlreadyAdded = existingItemNames.includes(med.name);
                                    return (
                                        <tr key={med.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">{med.name}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                    {med.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-800 font-mono text-xs rounded border border-gray-200 inline-block">
                                                    {med.batch}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                                                {med.expiry}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-emerald-600">
                                                {med.stock} units
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                ₹{med.price.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onSelect(med);
                                                        onClose();
                                                    }}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                        isAlreadyAdded
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                                    }`}
                                                >
                                                    {isAlreadyAdded ? (
                                                        <>
                                                            <FiCheck size={14} />
                                                            Added
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FiPlus size={14} />
                                                            Add
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredMedicines.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                            No medicines found matching "{searchQuery}".
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                    <span>Showing {filteredMedicines.length} of {mockMedicines.length} items</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
