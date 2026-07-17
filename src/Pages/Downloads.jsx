import React, { useState } from 'react';
import { FiMenu, FiDownload, FiCalendar } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { invInvoicesApi } from '../api/inventoryApiClient';

export default function Downloads({ setMobileOpen }) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [isLoading, setIsLoading] = useState(false);

    const downloadPDF = (title, data) => {
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("DATSHEETS ENTERPRISE DESK", 14, 18);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 25);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 14, 31);

        let totalAmount = 0;
        const tableRows = data.map((inv, index) => {
            const amount = Number(inv.grandTotal) || Number(inv.amount) || 0;
            totalAmount += amount;
            return [
                index + 1,
                inv.invoiceNo || `INV-${inv.id}`,
                inv.invoiceDate || inv.date || '',
                inv.partyName || 'Walk-in Customer',
                inv.type === 'wholesale' || inv.type === 'Wholesale' ? 'Wholesale' : 'Retail',
                inv.paymentMethod || 'Cash',
                `Rs ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];
        });

        autoTable(doc, {
            startY: 40,
            head: [['#', 'Invoice No', 'Date', 'Party/Customer', 'Type', 'Payment', 'Amount']],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                6: { halign: 'right' }
            }
        });

        const finalY = doc.lastAutoTable.finalY || 40;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(`Total Transaction Amount: Rs ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY + 10);
        
        const fileName = `${title.replace(/\s+/g, '_').toLowerCase()}.pdf`;
        doc.save(fileName);
    };

    const handleDownloadDaily = async (e) => {
        e.preventDefault();
        if (!selectedDate) {
            alert('Please select a date');
            return;
        }
        setIsLoading(true);
        try {
            const res = await invInvoicesApi.list();
            const allInvoices = res.data.data || [];
            const filtered = allInvoices.filter(inv => inv.invoiceDate === selectedDate);

            if (filtered.length === 0) {
                alert(`No transactions found for the selected date (${selectedDate}).`);
                return;
            }

            downloadPDF(`Daily Transaction Report - ${selectedDate}`, filtered);
        } catch (error) {
            console.error("Failed to fetch daily transactions:", error);
            alert("Failed to fetch transaction data: " + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadMonthly = async (e) => {
        e.preventDefault();
        if (!selectedMonth) {
            alert('Please select a month');
            return;
        }
        setIsLoading(true);
        try {
            const res = await invInvoicesApi.list();
            const allInvoices = res.data.data || [];
            const filtered = allInvoices.filter(inv => (inv.invoiceDate || '').startsWith(selectedMonth));

            if (filtered.length === 0) {
                alert(`No transactions found for the selected month (${selectedMonth}).`);
                return;
            }

            downloadPDF(`Monthly Transaction Report - ${selectedMonth}`, filtered);
        } catch (error) {
            console.error("Failed to fetch monthly transactions:", error);
            alert("Failed to fetch transaction data: " + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
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
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-semibold text-gray-900 truncate">
                        Downloads
                    </h1>
                </div>
            </header>
            
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Transaction Reports</h2>
                        <p className="text-gray-500 mt-1">Download your transaction data securely in PDF format.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Daily Report Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                    <FiCalendar size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Daily Report</h3>
                                    <p className="text-sm text-gray-500">Download transaction data for a specific day</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleDownloadDaily} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                                    >
                                        <FiDownload size={18} />
                                        {isLoading ? 'Fetching Data...' : 'Download Daily PDF'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Monthly Report Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-6 border-b border-gray-100 bg-emerald-50/50 flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                    <FiCalendar size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Monthly Report</h3>
                                    <p className="text-sm text-gray-500">Download transaction data for an entire month</p>
                                </div>
                            </div>
                            <div className="p-6">
                                <form onSubmit={handleDownloadMonthly} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                                        <input
                                            type="month"
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20 transition-all disabled:opacity-50"
                                    >
                                        <FiDownload size={18} />
                                        {isLoading ? 'Fetching Data...' : 'Download Monthly PDF'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
