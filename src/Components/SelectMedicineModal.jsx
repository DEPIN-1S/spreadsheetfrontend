import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiPlus, FiCheck, FiPackage } from 'react-icons/fi';
import { invSheetsApi } from '../api/inventoryApiClient';
import { parseGstPercent, loadProductGstMap } from '../utils/gst';
import { hasSellableStock, parseStockQty } from '../utils/stock';

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
            const missingGst = fetched.some(item => !parseGstPercent(item.gstPercent ?? item.gst));
            const gstByName = missingGst ? await loadProductGstMap(invSheetsApi) : {};
            
            // Map the API fields to the format expected by the modal
            const mapped = fetched.map(item => {
                const gstPercent = parseGstPercent(item.gstPercent ?? item.gst)
                    || gstByName[String(item.name || '').trim().toLowerCase()]
                    || 0;
                return {
                id: item.ccRowId,
                name: item.name,
                category: item.category,
                batch: item.batch,
                expiry: item.expiry,
                stock: parseStockQty(item.stock),
                rackNo: item.rackNo || '',
                // Pick retailPrice or wholesalePrice depending on type
                price: inventoryType === 'retail' ? item.retailPrice : item.wholesalePrice,
                mrp: item.mrp || 0,
                discount: item.discount || 0,
                wholesaleMargin: item.wholesaleMargin || 0,
                gst: item.gst || '',
                gstPercent,
                ccRowId: item.ccRowId
            };
            });
            
            setMedicines(mapped);
        } catch (error) {
            console.error("Failed to load medicine stock:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const categories = ['All', ...new Set(medicines.map(m => m.category || 'General'))];

    const isExpiredBatch = (expiryStr) => {
        if (!expiryStr || expiryStr.toLowerCase() === 'no expiry' || expiryStr.trim() === '') return false;
        
        let expDate = new Date(expiryStr);
        if (isNaN(expDate.getTime())) {
            const parts = expiryStr.trim().split(/\s+/);
            if (parts.length === 2) {
                expDate = new Date(`${parts[0]} 1, ${parts[1]}`);
            }
        }
        if (isNaN(expDate.getTime())) return false;
        
        const lastDay = new Date(expDate.getFullYear(), expDate.getMonth() + 1, 0, 23, 59, 59);
        const now = new Date();
        return lastDay < now;
    };

    const parseExpiryDateTimestamp = (expiryStr) => {
        if (!expiryStr || expiryStr.toLowerCase() === 'no expiry' || expiryStr.trim() === '') {
            return Infinity;
        }
        
        let expDate = new Date(expiryStr);
        if (isNaN(expDate.getTime())) {
            const parts = expiryStr.trim().split(/\s+/);
            if (parts.length === 2) {
                expDate = new Date(`${parts[0]} 1, ${parts[1]}`);
            }
        }
        
        if (isNaN(expDate.getTime())) return Infinity;
        return expDate.getTime();
    };

    const filteredMedicines = medicines.filter(med => {
        // Exclude items with No Batch or empty batch number
        const isNoBatch = !med.batch || med.batch.trim() === '' || med.batch.toLowerCase() === 'no batch';
        if (isNoBatch) return false;

        // Exclude expired batches
        if (isExpiredBatch(med.expiry)) return false;

        // Exclude batches with no remaining quantity
        if (!hasSellableStock(med.stock)) return false;

        const nameVal = med.name || '';
        const batchVal = med.batch || '';
        const catVal = med.category || '';
        const rackVal = med.rackNo || '';
        const matchesSearch = nameVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              batchVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              catVal.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              rackVal.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || (med.category || 'General') === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Sort medicines alphabetically by Name (A-Z), and by Expiry Month/Year ascending (Earliest expiry first, e.g. June 2026 before Dec 2026)
    const sortedMedicines = [...filteredMedicines].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        const nameCompare = nameA.localeCompare(nameB);
        if (nameCompare !== 0) return nameCompare;

        const timeA = parseExpiryDateTimestamp(a.expiry);
        const timeB = parseExpiryDateTimestamp(b.expiry);
        return timeA - timeB;
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
                                    <th className="px-4 py-3">Rack No.</th>
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
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex justify-center items-center gap-2">
                                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                                <span>Loading stock data...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    sortedMedicines.map(med => {
                                        const isAlreadyAdded = existingItemNames.includes(med.name);
                                        const noPrice = !med.price || med.price === 0;
                                        const outOfStock = !hasSellableStock(med.stock);
                                        const addDisabled = noPrice || outOfStock;
                                        return (
                                            <tr key={med.id} className={`transition-colors ${addDisabled ? 'opacity-60 bg-gray-50/50 hover:bg-gray-100/50' : 'hover:bg-indigo-50/30'}`}>
                                                <td className="px-4 py-3 font-medium text-gray-900">{med.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                        {med.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {med.rackNo ? (
                                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-medium rounded text-xs border border-amber-200">
                                                            {med.rackNo}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">-</span>
                                                    )}
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
                                                <td className={`px-4 py-3 text-right font-medium ${outOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {med.stock} units
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                    {noPrice
                                                        ? <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200">No Price</span>
                                                        : <span>₹{med.price.toFixed(2)}</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        type="button"
                                                        disabled={addDisabled}
                                                        onClick={() => {
                                                            if (addDisabled) return;
                                                            onSelect({
                                                                ...med,
                                                                gstPercent: parseGstPercent(med.gstPercent ?? med.gst)
                                                            });
                                                            onClose();
                                                        }}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                            addDisabled
                                                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                                : isAlreadyAdded
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
                                {!isLoading && sortedMedicines.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                                            {searchQuery
                                                ? `No medicines with available stock matching "${searchQuery}".`
                                                : 'No medicines with available stock.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                    <span>Showing {sortedMedicines.length} of {medicines.length} items</span>
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
