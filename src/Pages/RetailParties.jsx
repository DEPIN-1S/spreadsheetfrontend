import React, { useState } from 'react';
import { FiMenu, FiPlus, FiEdit2, FiTrash2, FiArrowLeft } from 'react-icons/fi';
import AddRetailPartyModal from '../Components/AddRetailPartyModal';

export default function RetailParties({ setMobileOpen, setActivePath }) {
    const [isAddPartyModalOpen, setIsAddPartyModalOpen] = useState(false);
    const [editingParty, setEditingParty] = useState(null);
    
    // Mock data for retail parties/customers
    const [allRetailParties, setAllRetailParties] = useState([
        { id: 1, name: 'John Doe (Walk-in)', contact: '+1 (555) 111-2233', email: 'johndoe@email.com', address: '12 Maple St, NY' },
        { id: 2, name: 'City Health Clinic', contact: '+1 (555) 222-3344', email: 'clinic@cityhealth.org', address: '45 Health Ave, CA' },
        { id: 3, name: 'General Hospital Dispensary', contact: '+1 (555) 333-4455', email: 'dispensary@genhosp.com', address: '88 Hospital Rd, TX' },
        { id: 4, name: 'Smith Care Center', contact: '+1 (555) 444-5566', email: 'info@smithcare.com', address: '200 Care Blvd, FL' },
        { id: 5, name: 'Greenwood Pharmacy', contact: '+1 (555) 555-6677', email: 'contact@greenwoodpharma.com', address: '15 Greenwood Way, WA' },
        { id: 6, name: 'Sunrise Medico', contact: '+1 (555) 666-7788', email: 'orders@sunrisemedico.com', address: '77 Sunrise Ct, IL' },
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
                        onClick={() => setActivePath('/inventory/retail-billing')}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Back to Retail Billing"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-900 truncate">
                        All Retail Parties / Customers
                    </h1>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsAddPartyModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white border border-indigo-600 text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm"
                        >
                            <FiPlus size={16} />
                            Add New Customer
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-gray-900">All Customers</h2>
                            <div className="text-sm text-gray-500">{allRetailParties.length} total</div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-6 py-3">Customer Name</th>
                                        <th className="px-6 py-3">Address</th>
                                        <th className="px-6 py-3">Contact</th>
                                        <th className="px-6 py-3">Email</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {allRetailParties.map((party) => (
                                        <tr key={party.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{party.name}</td>
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
                                                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors inline-flex" title="Delete">
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {allRetailParties.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                No retail customers found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            <AddRetailPartyModal 
                isOpen={isAddPartyModalOpen} 
                onClose={() => {
                    setIsAddPartyModalOpen(false);
                    setEditingParty(null);
                }} 
                initialData={editingParty}
            />
        </div>
    );
}
