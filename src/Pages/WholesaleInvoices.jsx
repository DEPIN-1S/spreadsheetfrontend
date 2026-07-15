import React, { useState } from 'react';
import { FiMenu, FiArrowLeft, FiEye, FiEdit2, FiDownload, FiTrash2, FiFileText } from 'react-icons/fi';
import PharmaInvoiceModal from '../Components/PharmaInvoiceModal';

export default function WholesaleInvoices({ setMobileOpen, setActivePath }) {
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    // Mock data for all invoices
    const [allInvoices, setAllInvoices] = useState([
        { id: 101, invoiceNo: 'INV-2026-001', date: '2026-06-15', partyName: 'Acme Wholesale Corp', amount: '₹12,500.00', paymentMethod: 'UPI', paymentStatus: 'Paid' },
        { id: 102, invoiceNo: 'INV-2026-002', date: '2026-06-16', partyName: 'Global Traders Inc.', amount: '₹34,000.00', paymentMethod: 'Cash', paymentStatus: 'Partially Paid', pendingAmount: '₹14,000.00' },
        { id: 103, invoiceNo: 'INV-2026-003', date: '2026-06-17', partyName: 'Metro Foods', amount: '₹8,900.00', paymentMethod: 'Cash', paymentStatus: 'Unpaid' },
        { id: 104, invoiceNo: 'INV-2026-004', date: '2026-06-17', partyName: 'Alpha Supplies', amount: '₹4,500.00', paymentMethod: 'UPI', paymentStatus: 'Paid' },
        { id: 105, invoiceNo: 'INV-2026-005', date: '2026-06-18', partyName: 'Regional Distributors', amount: '₹15,200.00', paymentMethod: 'UPI', paymentStatus: 'Partially Paid', pendingAmount: '₹5,200.00' },
        { id: 106, invoiceNo: 'INV-2026-006', date: '2026-06-18', partyName: 'Prime Vendors', amount: '₹22,100.00', paymentMethod: 'Cash', paymentStatus: 'Paid' },
        { id: 107, invoiceNo: 'INV-2026-007', date: '2026-06-19', partyName: 'Acme Wholesale Corp', amount: '₹6,400.00', paymentMethod: 'UPI', paymentStatus: 'Unpaid' },
        { id: 108, invoiceNo: 'INV-2026-008', date: '2026-06-19', partyName: 'Metro Foods', amount: '₹11,000.00', paymentMethod: 'Cash', paymentStatus: 'Paid' },
    ]);

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
                        onClick={() => setActivePath('/inventory/wholesale-billing')}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Back to Wholesale Billing"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900 truncate">
                        All Invoices
                    </h1>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-end gap-3">
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium rounded-md hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                            onClick={() => setActivePath && setActivePath('/inventory/wholesale-invoices/generate')}
                        >
                            <FiFileText size={16} />
                            Generate New Invoice
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900">All Invoices</h2>
                            <div className="text-sm text-gray-500">{allInvoices.length} total</div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-6 py-3">Invoice No.</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Party Name</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Payment Method</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {allInvoices.map((invoice) => {
                                        return (
                                        <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-indigo-600">{invoice.invoiceNo}</td>
                                            <td className="px-6 py-4 text-gray-600">{invoice.date}</td>
                                            <td className="px-6 py-4 text-gray-900">{invoice.partyName}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{invoice.amount}</div>
                                                {invoice.paymentStatus === 'Partially Paid' && invoice.pendingAmount && (
                                                    <div className="text-xs text-red-500 font-semibold mt-0.5">Pending: {invoice.pendingAmount}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    invoice.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-700' :
                                                    invoice.paymentMethod === 'Bank Transfer' ? 'bg-indigo-100 text-indigo-700' :
                                                    invoice.paymentMethod === 'Combined' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-purple-100 text-purple-700'
                                                }`}>
                                                    {invoice.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    invoice.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                                                    invoice.paymentStatus === 'Unpaid' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {invoice.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => setSelectedInvoice(invoice)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center justify-center" title="View Invoice">
                                                        <FiEye size={16} />
                                                    </button>
                                                    <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center justify-center" title="Edit Invoice">
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        );
                                    })}
                                    {allInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                No invoices found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
            <PharmaInvoiceModal 
                isOpen={!!selectedInvoice} 
                onClose={() => setSelectedInvoice(null)} 
                invoice={selectedInvoice} 
            />
        </div>
    );
}
