import React, { useState, useMemo } from 'react';
import { FiMenu, FiSearch, FiEye, FiDownload, FiTrash2, FiFileText, FiTrendingUp, FiBox, FiShoppingBag, FiFilter } from 'react-icons/fi';
import PharmaInvoiceModal from '../Components/PharmaInvoiceModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function BillingHistory({ setMobileOpen, setActivePath }) {
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'WHOLESALE', 'RETAIL'
    const [chAppliedIds, setChAppliedIds] = useState([]);

    const toggleCh = (id) => {
        setChAppliedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    // Combined mock history of wholesale and retail bills
    const [invoices, setInvoices] = useState([
        { id: 101, invoiceNo: 'INV-2026-001', date: '2026-06-15', partyName: 'Acme Wholesale Corp', amount: 12500.00, paymentMethod: 'UPI', type: 'Wholesale', status: 'Paid' },
        { id: 102, invoiceNo: 'INV-2026-002', date: '2026-06-16', partyName: 'Global Traders Inc.', amount: 34000.00, paymentMethod: 'Cash', type: 'Wholesale', status: 'Unpaid' },
        { id: 201, invoiceNo: 'INV-RET-2026-001', date: '2026-06-15', partyName: 'John Doe (Walk-in)', amount: 1250.00, paymentMethod: 'UPI', type: 'Retail', status: 'Paid' },
        { id: 103, invoiceNo: 'INV-2026-003', date: '2026-06-17', partyName: 'Metro Foods', amount: 8900.00, paymentMethod: 'Cash', type: 'Wholesale', status: 'Paid' },
        { id: 202, invoiceNo: 'INV-RET-2026-002', date: '2026-06-16', partyName: 'City Health Clinic', amount: 4500.00, paymentMethod: 'Cash', type: 'Retail', status: 'Partially Paid', pendingAmount: 1500.00 },
        { id: 104, invoiceNo: 'INV-2026-004', date: '2026-06-17', partyName: 'Alpha Supplies', amount: 4500.00, paymentMethod: 'UPI', type: 'Wholesale', status: 'Paid' },
        { id: 203, invoiceNo: 'INV-RET-2026-003', date: '2026-06-17', partyName: 'General Hospital Dispensary', amount: 8900.00, paymentMethod: 'Combined', type: 'Retail', status: 'Paid' },
        { id: 105, invoiceNo: 'INV-2026-005', date: '2026-06-18', partyName: 'Regional Distributors', amount: 15200.00, paymentMethod: 'UPI', type: 'Wholesale', status: 'Unpaid' },
        { id: 204, invoiceNo: 'INV-RET-2026-004', date: '2026-06-17', partyName: 'Smith Care Center', amount: 2300.00, paymentMethod: 'UPI', type: 'Retail', status: 'Paid' },
        { id: 106, invoiceNo: 'INV-2026-006', date: '2026-06-18', partyName: 'Prime Vendors', amount: 22100.00, paymentMethod: 'Cash', type: 'Wholesale', status: 'Paid' },
        { id: 205, invoiceNo: 'INV-RET-2026-005', date: '2026-06-18', partyName: 'Greenwood Pharmacy', amount: 5600.00, paymentMethod: 'UPI', type: 'Retail', status: 'Paid' },
        { id: 107, invoiceNo: 'INV-2026-007', date: '2026-06-19', partyName: 'Acme Wholesale Corp', amount: 6400.00, paymentMethod: 'UPI', type: 'Wholesale', status: 'Paid' },
        { id: 206, invoiceNo: 'INV-RET-2026-006', date: '2026-06-18', partyName: 'Sunrise Medico', amount: 3100.00, paymentMethod: 'Cash', type: 'Retail', status: 'Paid' },
        { id: 108, invoiceNo: 'INV-2026-008', date: '2026-06-19', partyName: 'Metro Foods', amount: 11000.00, paymentMethod: 'Cash', type: 'Wholesale', status: 'Paid' },
    ]);

    const stats = useMemo(() => {
        const activeInvoices = invoices.filter(inv => !chAppliedIds.includes(inv.id));
        const totalCount = invoices.length;
        const totalRevenue = activeInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const wholesaleInvoices = activeInvoices.filter(inv => inv.type === 'Wholesale');
        const retailInvoices = activeInvoices.filter(inv => inv.type === 'Retail');
        
        const wholesaleRevenue = wholesaleInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const retailRevenue = retailInvoices.reduce((sum, inv) => sum + inv.amount, 0);

        return {
            totalCount,
            totalRevenue,
            wholesaleCount: wholesaleInvoices.length,
            wholesaleRevenue,
            retailCount: retailInvoices.length,
            retailRevenue
        };
    }, [invoices, chAppliedIds]);

    // Filtered invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = 
                inv.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.partyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!matchesSearch) return false;

            if (filterType === 'WHOLESALE') return inv.type === 'Wholesale';
            if (filterType === 'RETAIL') return inv.type === 'Retail';
            return true;
        });
    }, [invoices, searchQuery, filterType]);

    const handleDeleteInvoice = (id) => {
        setInvoices(invoices.filter(inv => inv.id !== id));
    };

    const formatCurrency = (val) => {
        return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("COMPANY NAME", 14, 18);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text("Transaction History Report", 14, 25);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 14, 31);

        const exportInvoices = filteredInvoices.filter(inv => !chAppliedIds.includes(inv.id));

        let totalAmount = 0;
        const tableRows = exportInvoices.map((inv, index) => {
            const amountVal = Number(inv.amount) || 0;
            totalAmount += amountVal;
            return [
                index + 1,
                inv.invoiceNo,
                inv.date,
                inv.type === 'Wholesale' ? 'WH' : 'RT',
                inv.partyName,
                inv.paymentMethod,
                inv.status || 'Paid',
                `Rs. ${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];
        });

        // Add Grand Total row
        tableRows.push([
            "",
            "",
            "",
            "",
            "",
            "",
            "GRAND TOTAL:",
            `Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            head: [["#", "Invoice No", "Date", "Type", "Party / Customer Name", "Payment Method", "Status", "Amount"]],
            body: tableRows,
            startY: 36,
            styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 32, fontStyle: 'bold' },
                2: { cellWidth: 22 },
                3: { cellWidth: 15 },
                4: { cellWidth: 45 },
                5: { cellWidth: 26 },
                6: { cellWidth: 20 },
                7: { cellWidth: 22, halign: 'right' }
            },
            didParseCell: function(data) {
                if (data.row.index === tableRows.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [243, 244, 246];
                    if (data.column.index === 5 || data.column.index === 6) {
                        data.cell.styles.textColor = [79, 70, 229];
                        data.cell.styles.fontSize = 9;
                    }
                }
            }
        });

        doc.save(`Transaction_History_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-gray-50">
            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
                    >
                        <FiMenu size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                            Transaction History
                        </h1>
                        <p className="text-xs text-gray-500">
                            Comprehensive log of all WH and RT invoices
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadPDF}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                        title="Download PDF Report (Excludes CB Applied)"
                    >
                        <FiDownload size={15} />
                        Download PDF Report
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    
                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Transactions</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalCount}</p>
                                <p className="text-xs text-indigo-600 font-medium mt-0.5">All generated bills</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <FiFileText size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">WH Revenue</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(stats.wholesaleRevenue)}</p>
                                <p className="text-xs text-blue-600 font-medium mt-0.5">{stats.wholesaleCount} invoices</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                <FiBox size={24} />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">RT Revenue</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{formatCurrency(stats.retailRevenue)}</p>
                                <p className="text-xs text-purple-600 font-medium mt-0.5">{stats.retailCount} invoices</p>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                <FiShoppingBag size={24} />
                            </div>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                        {/* Filter Tabs */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
                            <button
                                onClick={() => setFilterType('ALL')}
                                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    filterType === 'ALL'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                All Bills ({stats.totalCount})
                            </button>
                            <button
                                onClick={() => setFilterType('WHOLESALE')}
                                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    filterType === 'WHOLESALE'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                WH ({stats.wholesaleCount})
                            </button>
                            <button
                                onClick={() => setFilterType('RETAIL')}
                                className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    filterType === 'RETAIL'
                                        ? 'bg-white text-indigo-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                RT ({stats.retailCount})
                            </button>
                        </div>

                        {/* Search Box */}
                        <div className="relative w-full sm:w-80">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search by Invoice No, Customer, Payment..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <FiFilter className="text-gray-500" />
                                <h2 className="text-base font-semibold text-gray-900">Transaction History</h2>
                            </div>
                            <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full">
                                {filteredInvoices.length} results
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[850px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                                        <th className="px-6 py-3.5">Invoice No.</th>
                                        <th className="px-6 py-3.5">Date</th>
                                        <th className="px-6 py-3.5">Type</th>
                                        <th className="px-6 py-3.5">Customer / Party Name</th>
                                        <th className="px-6 py-3.5">Payment Method</th>
                                        <th className="px-6 py-3.5">Status</th>
                                        <th className="px-6 py-3.5 text-right">Amount</th>
                                        <th className="px-6 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm font-medium">
                                    {filteredInvoices.map((inv) => {
                                        const isChApplied = chAppliedIds.includes(inv.id);
                                        return (
                                        <tr key={inv.id} className={`${isChApplied ? 'bg-orange-50/80 hover:bg-orange-100/80' : 'hover:bg-gray-50/80'} transition-colors group`}>
                                            <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                                                {inv.invoiceNo}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 font-sans">
                                                {inv.date}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                                                    inv.type === 'Wholesale' 
                                                        ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                                                }`}>
                                                    {inv.type === 'Wholesale' ? <FiBox size={12} /> : <FiShoppingBag size={12} />}
                                                    {inv.type === 'Wholesale' ? 'WH' : 'RT'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {inv.partyName}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                                    inv.paymentMethod === 'Cash' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                    inv.paymentMethod === 'UPI' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                                    'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}>
                                                    {inv.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                                    inv.status === 'Paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                    inv.status === 'Unpaid' ? 'bg-red-50 text-red-700 border border-red-200' :
                                                    'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                }`}>
                                                    {inv.status || 'Paid'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-extrabold font-mono text-gray-900">{formatCurrency(inv.amount)}</div>
                                                {inv.status === 'Partially Paid' && inv.pendingAmount && (
                                                    <div className="text-xs text-red-500 font-semibold mt-0.5 font-sans">Pending: {formatCurrency(inv.pendingAmount)}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => setSelectedInvoice(inv)} 
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center" 
                                                        title="View Tax Invoice"
                                                    >
                                                        <FiEye size={17} />
                                                    </button>
                                                    <button 
                                                        onClick={() => toggleCh(inv.id)} 
                                                        className={`h-7 px-2.5 font-extrabold text-xs rounded-lg transition-colors flex items-center justify-center whitespace-nowrap shadow-sm ${
                                                            isChApplied 
                                                                ? 'bg-orange-500 text-white hover:bg-orange-600' 
                                                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                                                        }`} 
                                                        title={isChApplied ? "CB Applied (Click to remove)" : "Apply CB"}
                                                    >
                                                        {isChApplied ? "CB Applied" : "CB"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {filteredInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-sans">
                                                <FiFileText className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                                                <p className="text-base font-semibold text-gray-600">No invoices found</p>
                                                <p className="text-xs text-gray-400 mt-1">Try adjusting your search query or filter criteria.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>

            {/* Tax Invoice Modal Preview */}
            <PharmaInvoiceModal 
                isOpen={!!selectedInvoice} 
                onClose={() => setSelectedInvoice(null)} 
                invoice={selectedInvoice} 
            />
        </div>
    );
}
