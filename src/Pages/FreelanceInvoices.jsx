import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiEye, FiDownload, FiMenu } from 'react-icons/fi';
import AddPersonalTemplateModal from '../Components/AddPersonalTemplateModal';
import GeneratePersonalInvoiceModal from '../Components/GeneratePersonalInvoiceModal';
import Pagination from '../Components/Pagination';
import { freelanceApi } from '../api/apiClient';

export default function FreelanceInvoices({ setMobileOpen, setActivePath }) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedTemplateToGenerate, setSelectedTemplateToGenerate] = useState(null);
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [savedInvoices, setSavedInvoices] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const paginatedInvoices = savedInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);



    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteInvoice = async (id) => {
        if (!window.confirm("Are you sure you want to delete this invoice?")) return;
        try {
            await freelanceApi.deleteInvoice(id);
            setSavedInvoices(prev => prev.filter(inv => inv.id !== id));
        } catch (err) {
            console.error("Error deleting invoice", err);
        }
    };

    const fetchData = async () => {
        try {
            const invRes = await freelanceApi.getInvoices().catch(() => ({ data: { data: [] } }));
            if (invRes.data?.data) setSavedInvoices(invRes.data.data);
        } catch (err) {
            console.error("Failed to fetch freelance data", err);
        }
    };

    const handleConfigureInvoice = (data) => {
        // Bypass template saving and directly open the invoice generator with the configured data
        setSelectedTemplateToGenerate(data);
        setIsAddModalOpen(false);
        setIsGenerateModalOpen(true);
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-white overflow-hidden relative">
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4 relative">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
                        title="Open Sidebar"
                    >
                        <FiMenu size={24} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                        Personal Invoices
                    </h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Generate New Invoice</h2>
                        {/* Create Invoice Button */}
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-95"
                        >
                            <span className="text-xl leading-none">+</span>
                            Create Invoice
                        </button>
                    </div>
                </div>

                {/* Saved Invoices Section */}
                <div className="max-w-6xl mx-auto mt-12">
                    <div className="flex items-center gap-3 mb-4 border-b border-gray-200 pb-2">
                        <h2 className="text-lg font-bold text-gray-900">Saved Invoices</h2>
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">{savedInvoices.length}</span>
                    </div>
                    {savedInvoices.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-500 font-medium">No invoices saved yet.</p>
                            <p className="text-sm text-gray-400 mt-1">Generate and save an invoice to see it here.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                            <th className="px-6 py-3">Invoice No</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Client</th>
                                            <th className="px-6 py-3 text-right">Total Amount</th>
                                              <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-sm">
                                        {paginatedInvoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-indigo-600">{inv.invoiceNo}</div>
                                                    
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{inv.date}</td>
                                                <td className="px-6 py-4 text-gray-900 font-semibold">{inv.clientName}</td>
                                                <td className="px-6 py-4 text-right font-black text-gray-900">₹{inv.grandTotal}</td><td className="px-6 py-4 text-right space-x-3">
    <button onClick={() => setViewingInvoice(inv)} className="text-gray-500 hover:text-indigo-600 transition-colors" title="View PDF">
        <FiEye size={18} />
    </button>
    <button onClick={() => { setEditingInvoice(inv); setIsGenerateModalOpen(true); }} className="text-gray-500 hover:text-blue-600 transition-colors" title="Edit">
        <FiEdit2 size={18} />
    </button>
    <button onClick={() => handleDeleteInvoice(inv.id)} className="text-gray-500 hover:text-red-600 transition-colors" title="Delete">
        <FiTrash2 size={18} />
    </button>
</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination
                                currentPage={currentPage}
                                totalItems={savedInvoices.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        </div>
                    )}
                </div>
            </main>



            <AddPersonalTemplateModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSave={handleConfigureInvoice}
            />

            <GeneratePersonalInvoiceModal 
                isOpen={isGenerateModalOpen}
                onClose={() => {
                    setIsGenerateModalOpen(false);
                    setSelectedTemplateToGenerate(null);
                }}
                template={editingInvoice ? editingInvoice.template : selectedTemplateToGenerate}
                savedInvoice={editingInvoice}
                  allInvoices={savedInvoices}
                mode={null}
                                onSaveInvoice={async (invoice) => {
                    try {
                        if (editingInvoice) {
                            const res = await freelanceApi.updateInvoice(editingInvoice.id, invoice);
                            const updatedInv = res.data?.data || invoice;
                            setSavedInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? updatedInv : inv));
                        } else {
                            const res = await freelanceApi.createInvoice(invoice);
                            const savedInv = res.data?.data || invoice;
                            setSavedInvoices(prev => [savedInv, ...prev]);
                        }
                    } catch (err) {
                        console.error("Failed to save invoice to backend", err);
                        if (editingInvoice) {
                            setSavedInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? invoice : inv));
                        } else {
                            setSavedInvoices(prev => [invoice, ...prev]);
                        }
                    }
                    setIsGenerateModalOpen(false);
                    setEditingInvoice(null);
                }}
            />

            <GeneratePersonalInvoiceModal 
                isOpen={!!viewingInvoice} 
                onClose={() => setViewingInvoice(null)} 
                template={viewingInvoice?.template}
                savedInvoice={viewingInvoice}
                  allInvoices={savedInvoices}
                mode="view"
            />

        </div>
    );
}
