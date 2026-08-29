import React, { useState, useEffect } from 'react';
import { FiMenu, FiBookOpen, FiSearch, FiUploadCloud, FiImage, FiPaperclip, FiX, FiCheckCircle, FiTrash2, FiEye, FiDownload } from 'react-icons/fi';
import Swal from 'sweetalert2';
import Pagination from '../Components/Pagination';
import { invLedgerApi } from '../api/inventoryApiClient';

export default function Ledger({ setMobileOpen }) {
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('WH');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [statusValue, setStatusValue] = useState('Pending');
    const [newPendingAmount, setNewPendingAmount] = useState('');
    const [proofUrl, setProofUrl] = useState('');
    const [viewingProofEntry, setViewingProofEntry] = useState(null);

    const fetchLedger = async () => {
        try {
            const res = await invLedgerApi.list();
            setLedgerEntries(res.data.data || []);
        } catch (error) {
            console.error("Failed to load ledger:", error);
        }
    };

    useEffect(() => {
        fetchLedger();
    }, []);

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

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType]);

    const paginatedEntries = React.useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredEntries.slice(start, start + itemsPerPage);
    }, [filteredEntries, currentPage, itemsPerPage]);

    const openManageModal = (entry, initialStatus) => {
        setSelectedEntry(entry);
        const targetStatus = initialStatus || entry.status || 'Pending';
        setStatusValue(targetStatus);
        setNewPendingAmount(targetStatus === 'Settled' ? '0' : String(entry.pendingAmount ?? 0));
        setProofUrl(entry.proofUrl || '');
        setIsModalOpen(true);
    };

    const handleProofFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'File Too Large',
                text: 'Please select an image or screenshot under 10MB.',
                confirmButtonColor: '#4F46E5',
                customClass: { popup: 'rounded-2xl' }
            });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setProofUrl(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveLedgerStatus = async () => {
        if (!selectedEntry) return;
        const amt = Number(newPendingAmount);
        if (isNaN(amt) || amt < 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Amount',
                text: 'Please enter a valid positive pending amount.',
                confirmButtonColor: '#4F46E5',
                customClass: { popup: 'rounded-2xl' }
            });
            return;
        }

        try {
            const finalPending = statusValue === 'Settled' ? 0 : amt;
            await invLedgerApi.update(selectedEntry.id, {
                status: statusValue,
                pendingAmount: finalPending,
                proofUrl: proofUrl
            });
            Swal.fire({
                icon: 'success',
                title: 'Ledger Updated',
                text: statusValue === 'Settled' ? 'Ledger entry marked as Settled.' : 'Status and pending amount updated successfully.',
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: 'rounded-2xl' }
            });
            setIsModalOpen(false);
            setSelectedEntry(null);
            fetchLedger();
        } catch (error) {
            console.error("Failed to save ledger status:", error);
            Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: error.response?.data?.message || error.message || 'Failed to update ledger status.',
                confirmButtonColor: '#4F46E5',
                customClass: { popup: 'rounded-2xl' }
            });
        }
    };

    const handleRemoveProof = async (entry) => {
        try {
            await invLedgerApi.update(entry.id, { proofUrl: null });
            Swal.fire({
                icon: 'success',
                title: 'Proof Removed',
                timer: 1200,
                showConfirmButton: false,
                customClass: { popup: 'rounded-2xl' }
            });
            if (viewingProofEntry?.id === entry.id) {
                setViewingProofEntry(null);
            }
            fetchLedger();
        } catch (err) {
            console.error("Failed to remove proof:", err);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedEntry(null);
        setProofUrl('');
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
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex flex-wrap justify-between items-center gap-3">
                            <div className="flex items-center gap-2">
                                <FiBookOpen className="text-gray-500" />
                                <h2 className="text-lg font-medium text-gray-900">Ledger Entries</h2>
                            </div>

                            {/* Top Section Color Meaning Legend */}
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                <div className="flex items-center gap-1.5 bg-[#dcfce7] text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md font-semibold shadow-2xs" title="Green row color indicates bill is Paid / Settled (₹0.00 pending)">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600 inline-block shrink-0"></span>
                                    <span>Green = Paid / Settled</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white text-gray-700 border border-gray-300 px-2.5 py-1 rounded-md font-semibold shadow-2xs" title="White row color indicates bill is Unpaid or Partially Paid">
                                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-gray-400 inline-block shrink-0"></span>
                                    <span>White = Unpaid &amp; Partially Paid</span>
                                </div>
                                <span className="text-sm font-medium bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                                    {filteredEntries.length} records
                                </span>
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[750px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Customer Name</th>
                                        <th className="px-6 py-3">Phone</th>
                                        <th className="px-6 py-3">Invoice No.</th>
                                        <th className="px-6 py-3 text-right">Pending Amount</th>
                                        <th className="px-6 py-3 text-center">Manage Status</th>
                                        <th className="px-6 py-3 text-center">Settlement Proof</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {paginatedEntries.map((entry) => {
                                        const isPaid = entry.status === 'Settled' || Number(entry.pendingAmount) <= 0;
                                        return (
                                        <tr
                                            key={entry.id}
                                            className={`transition-colors ${
                                                isPaid 
                                                    ? 'bg-[#dcfce7]/60 hover:bg-[#dcfce7]/80 text-gray-900 font-medium' 
                                                    : 'bg-white hover:bg-gray-50 text-gray-900'
                                            }`}
                                        >
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
                                            <td className="px-6 py-4 text-gray-600 text-xs font-mono">{entry.phone || 'N/A'}</td>
                                            <td className="px-6 py-4 text-indigo-600 font-mono text-xs">{entry.invoiceNo}</td>
                                            <td className={`px-6 py-4 text-right font-semibold font-mono ${isPaid ? 'text-emerald-700' : 'text-red-600'}`}>
                                                {formatCurrency(entry.pendingAmount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <select
                                                    value={entry.status || 'Pending'}
                                                    onChange={(e) => openManageModal(entry, e.target.value)}
                                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer border focus:outline-none focus:ring-2 transition-colors ${
                                                        entry.status === 'Settled' 
                                                            ? 'bg-green-100 text-green-800 border-green-300 focus:ring-green-500/30' 
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
                                            <td className="px-6 py-4 text-center">
                                                {entry.proofUrl ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingProofEntry(entry)}
                                                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md text-xs font-semibold transition-colors"
                                                            title="View attached payment proof / screenshot"
                                                        >
                                                            <FiImage size={13} />
                                                            View Proof
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => openManageModal(entry, entry.status)}
                                                        className="flex items-center justify-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md text-xs font-medium transition-colors mx-auto"
                                                        title="Upload screenshot or payment proof"
                                                    >
                                                        <FiPaperclip size={12} />
                                                        + Attach
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                    })}
                                    {filteredEntries.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
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

            {/* Manage Status & Optional Settlement Proof Modal */}
            {isModalOpen && selectedEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Manage Ledger Status</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Customer: <span className="font-semibold text-gray-700">{selectedEntry.customerName}</span> ({selectedEntry.invoiceNo})
                                    </p>
                                </div>
                                <button
                                    onClick={handleCloseModal}
                                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                >
                                    <FiX size={18} />
                                </button>
                            </div>

                            {/* Status Option */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Status
                                </label>
                                <select
                                    value={statusValue}
                                    onChange={(e) => {
                                        const newSt = e.target.value;
                                        setStatusValue(newSt);
                                        if (newSt === 'Settled') {
                                            setNewPendingAmount('0');
                                        } else if (newSt === 'Pending') {
                                            setNewPendingAmount(String(selectedEntry.pendingAmount || 0));
                                        }
                                    }}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Partially Paid">Partially Paid</option>
                                    <option value="Settled">Settled (Paid in Full)</option>
                                </select>
                            </div>

                            {/* Pending Amount */}
                            {statusValue !== 'Settled' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Pending Amount (₹)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-medium text-gray-900"
                                            value={newPendingAmount}
                                            onChange={(e) => setNewPendingAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Optional Payment Screenshot / Proof Upload */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                    Optional Payment Screenshot / Settlement Proof
                                </label>
                                
                                {proofUrl ? (
                                    <div className="relative rounded-xl border border-gray-200 overflow-hidden group bg-gray-50 p-2 flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {proofUrl.startsWith('data:image') || proofUrl.startsWith('http') ? (
                                                <img src={proofUrl} alt="Payment Proof" className="w-12 h-12 object-cover rounded-lg border border-gray-200" />
                                            ) : (
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                                                    DOC
                                                </div>
                                            )}
                                            <div className="text-xs truncate">
                                                <span className="font-semibold text-emerald-700 block">Screenshot Attached</span>
                                                <span className="text-gray-500">Ready to save</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setProofUrl('')}
                                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove image"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl cursor-pointer bg-gray-50 hover:bg-indigo-50/50 transition-all text-center">
                                        <FiUploadCloud size={24} className="text-indigo-600 mb-1" />
                                        <span className="text-xs font-semibold text-gray-800">Upload Receipt / Screenshot</span>
                                        <span className="text-[11px] text-gray-500 mt-0.5">Click to choose image or drop file here</span>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={handleProofFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCloseModal}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveLedgerStatus}
                                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                            >
                                <FiCheckCircle size={16} />
                                Save Settlement & Status
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Proof Viewer Modal */}
            {viewingProofEntry && viewingProofEntry.proofUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">Settlement Proof / Screenshot</h3>
                                <p className="text-xs text-gray-500">Invoice: {viewingProofEntry.invoiceNo} • {viewingProofEntry.customerName}</p>
                            </div>
                            <button
                                onClick={() => setViewingProofEntry(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex items-center justify-center bg-gray-900/5 min-h-[300px]">
                            {viewingProofEntry.proofUrl.startsWith('data:image') || viewingProofEntry.proofUrl.startsWith('http') ? (
                                <img
                                    src={viewingProofEntry.proofUrl}
                                    alt="Payment Screenshot Proof"
                                    className="max-h-[60vh] max-w-full object-contain rounded-lg border border-gray-200 shadow-md"
                                />
                            ) : (
                                <iframe
                                    src={viewingProofEntry.proofUrl}
                                    title="Proof Document"
                                    className="w-full h-[50vh] rounded-lg border border-gray-200"
                                />
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => handleRemoveProof(viewingProofEntry)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors border border-red-200"
                            >
                                <FiTrash2 size={14} />
                                Delete Proof
                            </button>
                            <div className="flex items-center gap-2">
                                <a
                                    href={viewingProofEntry.proofUrl}
                                    download={`Settlement-Proof-${viewingProofEntry.invoiceNo}.png`}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    <FiDownload size={14} />
                                    Download Image
                                </a>
                                <button
                                    onClick={() => setViewingProofEntry(null)}
                                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
