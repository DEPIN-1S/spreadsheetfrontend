import React, { useState, useEffect } from 'react';
import { FiMenu, FiPlus, FiEdit2, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import AddWholesalePartyModal from '../Components/AddWholesalePartyModal';
import { invPartiesApi } from '../api/inventoryApiClient';

export default function WholesaleParties({ setMobileOpen, setActivePath }) {
    const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
    const [editingParty, setEditingParty] = useState(null);
    const [allWholesaleParties, setAllWholesaleParties] = useState([]);

    useEffect(() => {
        fetchParties();
    }, []);

    const fetchParties = async () => {
        try {
            const res = await invPartiesApi.list('wholesale');
            setAllWholesaleParties(res.data.data || []);
        } catch (error) {
            console.error("Failed to load wholesale parties:", error);
        }
    };

    const handleSaveParty = async (formData) => {
        try {
            if (editingParty) {
                await invPartiesApi.update('wholesale', editingParty.id, formData);
            } else {
                await invPartiesApi.create('wholesale', formData);
            }
            fetchParties();
        } catch (error) {
            console.error("Failed to save wholesale party:", error);
        }
    };

    const handleDeleteParty = async (id) => {
        if (!window.confirm("Are you sure you want to delete this party?")) return;
        try {
            await invPartiesApi.delete('wholesale', id);
            fetchParties();
        } catch (error) {
            console.error("Failed to delete wholesale party:", error);
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
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button 
                        onClick={() => setActivePath('/inventory/wholesale-billing')}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Back to Wholesale Billing"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900 truncate">
                        All Wholesale Parties
                    </h1>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsAddPartyModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white border border-indigo-600 text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        >
                            <FiPlus size={16} />
                            Add New Party
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900">All Parties</h2>
                            <div className="text-sm text-gray-500">{allWholesaleParties.length} total</div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-6 py-3">Party Name</th>
                                        <th className="px-6 py-3">Registration No.</th>
                                        <th className="px-6 py-3">Address</th>
                                        <th className="px-6 py-3">Contact</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {allWholesaleParties.map((party) => (
                                        <tr key={party.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{party.name}</td>
                                            <td className="px-6 py-4 text-gray-600">{party.registrationNo}</td>
                                            <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate" title={party.address}>{party.address || <span className="text-gray-400 italic">N/A</span>}</td>
                                            <td className="px-6 py-4 text-gray-600">{party.contact}</td>
                                            <td className="px-6 py-4 text-gray-600">{party.email || <span className="text-gray-400 italic">N/A</span>}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button 
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors inline-flex"
                                                    onClick={() => {
                                                        setEditingParty(party);
                                                        setIsAddPartyModalOpen(true);
                                                    }}
                                                    title="Edit"
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button 
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors inline-flex"
                                                    onClick={() => handleDeleteParty(party.id)}
                                                    title="Delete"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {allWholesaleParties.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                No parties found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <AddWholesalePartyModal 
                isOpen={isAddPartyModalOpen} 
                onClose={() => {
                    setIsAddPartyModalOpen(false);
                    setEditingParty(null);
                }} 
                onSave={handleSaveParty}
                initialData={editingParty}
            />
        </div>
    );
}
