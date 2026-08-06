import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiPlus, FiCheck, FiPackage } from 'react-icons/fi';
import { invSheetsApi } from '../api/inventoryApiClient';

export default function SelectMedicineModal({ isOpen, onClose, onSelect, existingItemNames = [], inventoryType = 'wholesale' }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [medicines, setMedicines] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchMedicines();
        }
    }, [isOpen]);

    const fetchMedicines = async () => {
        setIsLoading(true);
        try {
            const res = await invSheetsApi.listAllBatches();
            const fetched = res.data.data || [];
            
            // Map the API fields to the format expected by the modal
            const mapped = fetched.map(item => ({
                id: item.ccRowId,
                name: item.name,
                category: item.category,
                batch: item.batch,
                expiry: item.expiry,
                stock: item.stock,
                // Pick retailPrice or wholesalePrice depending on type
                price: inventoryType === 'retail' ? item.retailPrice : item.wholesalePrice,
                ccRowId: item.ccRowId
            }));
            
            setMedicines(mapped);
        } catch (error) {
            console.error("Failed to load medicine stock:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const categories = ['All', ...new Set(medicines.map(m => m.category || 'General'))];

    const filteredMedicines = medicines.filter(med => {
        const nameVal = med.name || '';
        const batchVal = med.batch || '';
        const catVal = med.category || '';
        const matchesSearch = nameVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              batchVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              catVal.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || (med.category || 'General') === selectedCategory;
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
                            <p className="text-xs text-gray-500">Search and pick from live {inventoryType} stock batches</p>
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
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                <span>Loading stock data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMedicines.map(med => {
                                        const isAlreadyAdded = existingItemNames.includes(med.name);
                                        return (
                                            <tr key={med.id} className="hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900">{med.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                        {med.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-800 font-mono text-xs rounded border border-gray-200 inline-block">
                                                        {med.batch}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600 font-medium">
                                                    {(() => {
                                                        if (!med.expiry) return 'N/A';
                                                        const parts = String(med.expiry).split(/[-/,\s]+/);
                                                        let mNum = null, yNum = null;
                                                        if (parts.length >= 2) {
                                                            const yearIdx = parts.findIndex(p => p.length === 4 && !isNaN(parseInt(p, 10)));
                                                            if (yearIdx !== -1) {
                                                                yNum = parts[yearIdx];
                                                                const otherPart = parts.find((p, idx) => idx !== yearIdx && p.length > 0);
                                                                if (otherPart) mNum = parseInt(otherPart, 10);
                                                            }
                                                        }
                                                        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                                                        if (mNum >= 1 && mNum <= 12 && yNum) {
                                                            return `${monthNames[mNum - 1]} ${yNum}`;
                                                        }
                                                        return med.expiry;
                                                    })()}
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
                                    })
                                )}
                                {!isLoading && filteredMedicines.length === 0 && (
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
                    <span>Showing {filteredMedicines.length} of {medicines.length} items</span>
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
