import React, { useState } from 'react';
import { FiMenu, FiDownload, FiCalendar } from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Dummy data generator for demonstration
const generateDummyTransactions = (count) => {
    const types = ['Retail', 'Wholesale'];
    const methods = ['UPI', 'Cash', 'Combined'];
    const parties = ['Walk-in Customer', 'City Health Clinic', 'Acme Wholesale Corp', 'Metro Foods'];
    
    return Array.from({ length: count }).map((_, i) => ({
        id: i + 1,
        invoiceNo: `INV-2026-${String(i+1).padStart(3, '0')}`,
        date: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        partyName: parties[Math.floor(Math.random() * parties.length)],
        amount: Math.floor(Math.random() * 50000) + 500,
        paymentMethod: methods[Math.floor(Math.random() * methods.length)],
        type: types[Math.floor(Math.random() * types.length)]
    }));
};

export default function Downloads({ setMobileOpen }) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const downloadPDF = (title, data) => {
        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text("COMPANY NAME", 14, 18);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(title, 14, 25);
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`, 14, 31);

        let totalAmount = 0;
        const tableRows = data.map((inv, index) => {
            totalAmount += inv.amount;
            return [
                index + 1,
                inv.invoiceNo,
                inv.date,
                inv.partyName,
                inv.type,
                inv.paymentMethod,
                `Rs ${inv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
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
        doc.text(`Total Transaction Amount: Rs ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 14, finalY + 10);
        
        const fileName = `${title.replace(/\s+/g, '_').toLowerCase()}.pdf`;
        doc.save(fileName);
    };

    const handleDownloadDaily = (e) => {
        e.preventDefault();
        if (!selectedDate) {
            alert('Please select a date');
            return;
        }
        const data = generateDummyTransactions(15);
        downloadPDF(`Daily Transaction Report - ${selectedDate}`, data);
    };

    const handleDownloadMonthly = (e) => {
        e.preventDefault();
        if (!selectedMonth) {
            alert('Please select a month');
            return;
        }
        const data = generateDummyTransactions(45);
        downloadPDF(`Monthly Transaction Report - ${selectedMonth}`, data);
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
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 transition-all"
                                    >
                                        <FiDownload size={18} />
                                        Download Daily PDF
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
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-500/20 transition-all"
                                    >
                                        <FiDownload size={18} />
                                        Download Monthly PDF
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
