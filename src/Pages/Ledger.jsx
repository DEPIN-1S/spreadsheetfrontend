import React, { useState, useEffect } from 'react';
import { FiMenu, FiBookOpen, FiSearch } from 'react-icons/fi';
import Pagination from '../Components/Pagination';
import { invLedgerApi } from '../api/inventoryApiClient';

export default function Ledger({ setMobileOpen, setActivePath }) {
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [newPendingAmount, setNewPendingAmount] = useState('');

    useEffect(() => {
        fetchLedger();
    }, []);

    const fetchLedger = async () => {
        try {
            const res = await invLedgerApi.list();
            setLedgerEntries(res.data.data || []);
        } catch (error) {
            console.error("Failed to load ledger:", error);
        }
    };

    const filteredEntries = ledgerEntries.filter(entry => {
        const nameMatch = (entry.customerName || '').toLowerCase().includes(searchQuery.toLowerCase());
        const phoneMatch = (entry.phone || '').includes(searchQuery);
        const matchesSearch = nameMatch || phoneMatch;
        const matchesType = filterType === 'ALL' || (filterType === 'WH' && entry.type === 'Wholesale') || (filterType === 'RT' && entry.type === 'Retail');
        return matchesSearch && matchesType;
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType]);

    const paginatedEntries = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredEntries.slice(start, start + itemsPerPage);
    }, [filteredEntries, currentPage, itemsPerPage]);

    const handleStatusChange = async (id, newStatus) => {
        const entry = ledgerEntries.find(e => e.id === id);
        if (!entry) return;

        if (newStatus === 'Partially Paid') {
            setSelectedEntry(entry);
            setNewPendingAmount(entry.pendingAmount.toString());
            setIsModalOpen(true);
        } else if (newStatus === 'Settled') {
            try {
                await invLedgerApi.update(id, { status: newStatus, pendingAmount: 0 });
                fetchLedger();
            } catch (error) {
                console.error("Failed to update status:", error);
            }
        } else {
            try {
                await invLedgerApi.update(id, { status: newStatus });
                fetchLedger();
            } catch (error) {
                console.error("Failed to update status:", error);
            }
        }
    };

    const handleSavePartialPayment = async () => {
        const amt = Number(newPendingAmount);
        if (!isNaN(amt) && amt >= 0) {
            try {
                await invLedgerApi.update(selectedEntry.id, { status: 'Partially Paid', pendingAmount: amt });
                setIsModalOpen(false);
                setSelectedEntry(null);
                fetchLedger();
            } catch (error) {
                console.error("Failed to save partial payment:", error);
            }
        } else {
            alert("Please enter a valid positive number.");
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedEntry(null);
    };

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-semibold text-gray-900 truncate">
                        Ledger
                    </h1>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Filters and Search */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                            <button
                                onClick={() => setFilterType('ALL')}
                                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    filterType === 'ALL'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                All ({ledgerEntries.length})
                            </button>
                            <button
                                onClick={() => setFilterType('WH')}
                                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    filterType === 'WH'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                WH ({ledgerEntries.filter(e => e.type === 'Wholesale').length})
                            </button>
                            <button
                                onClick={() => setFilterType('RT')}
                                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    filterType === 'RT'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                RT ({ledgerEntries.filter(e => e.type === 'Retail').length})
                            </button>
                        </div>
                        <div className="relative w-full sm:w-80">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by customer or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FiBookOpen className="text-gray-500" />
                                <h2 className="text-lg font-medium text-gray-900">Ledger Entries</h2>
                            </div>
                            <span className="text-sm font-medium bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                                {filteredEntries.length} records
                            </span>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Customer Name</th>
                                        <th className="px-6 py-3">Phone</th>
                                        <th className="px-6 py-3">Invoice No.</th>
                                        <th className="px-6 py-3 text-right">Pending Amount</th>
                                        <th className="px-6 py-3 text-center">Manage Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {paginatedEntries.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-gray-600">{entry.date}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                    entry.type === 'Wholesale' 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {entry.type === 'Wholesale' ? 'WH' : 'RT'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{entry.customerName}</td>
                                            <td className="px-6 py-4 text-gray-600 text-xs font-mono">{entry.phone}</td>
                                            <td className="px-6 py-4 text-indigo-600 font-mono text-xs">{entry.invoiceNo}</td>
                                            <td className="px-6 py-4 text-right font-semibold font-mono text-red-600">
                                                {formatCurrency(entry.pendingAmount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <select
                                                    value={entry.status || 'Pending'}
                                                    onChange={(e) => handleStatusChange(entry.id, e.target.value)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border focus:outline-none focus:ring-2 transition-colors ${
                                                        entry.status === 'Settled' 
                                                            ? 'bg-green-50 text-green-700 border-green-200 focus:ring-green-500/30' 
                                                            : entry.status === 'Partially Paid'
                                                                ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500/30'
                                                                : 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500/30'
                                                    }`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Partially Paid">Partially Paid</option>
                                                    <option value="Settled">Settled</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredEntries.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                                No ledger entries found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalItems={filteredEntries.length}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    </div>
                </div>
            </main>

            {/* Partial Payment Modal */}
            {isModalOpen && selectedEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Update Pending Amount</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Enter the remaining balance for <span className="font-semibold text-gray-700">{selectedEntry.customerName}</span>.
                            </p>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    New Pending Amount
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-mono font-medium text-gray-900"
                                        value={newPendingAmount}
                                        onChange={(e) => setNewPendingAmount(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSavePartialPayment()}
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePartialPayment}
                                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                            >
                                Update Amount
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
