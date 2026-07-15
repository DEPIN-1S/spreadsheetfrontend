import React, { useState } from 'react';
import { FiMenu, FiArrowLeft, FiPlus, FiTrash2, FiPrinter, FiCheckCircle, FiSearch } from 'react-icons/fi';
import AddWholesalePartyModal from '../Components/AddWholesalePartyModal';
import SelectMedicineModal from '../Components/SelectMedicineModal';
import PharmaInvoiceModal from '../Components/PharmaInvoiceModal';

export default function GenerateWholesaleInvoice({ setMobileOpen, setActivePath }) {
    const [parties, setParties] = useState([
        { id: 1, name: 'Acme Wholesale Corp', contact: '+1 (555) 123-4567', email: 'billing@acmewholesale.com', registrationNo: 'REG-998877', address: '123 Market Street, NY' },
        { id: 2, name: 'Global Traders Inc.', contact: '+1 (555) 987-6543', email: 'accounts@globaltraders.com', registrationNo: 'REG-445566', address: '456 Export Blvd, CA' },
        { id: 3, name: 'Metro Foods', contact: '+1 (555) 234-5678', email: 'orders@metrofoods.com', registrationNo: 'REG-112233', address: '789 City Ave, TX' },
        { id: 4, name: 'Regional Distributors', contact: '+1 (555) 876-5432', email: 'info@regionaldist.com', registrationNo: 'REG-334455', address: '321 Warehouse Rd, FL' },
        { id: 5, name: 'Prime Vendors', contact: '+1 (555) 345-6789', email: 'support@primevendors.com', registrationNo: 'REG-556677', address: '654 Logistics Pkwy, WA' },
    ]);

    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSelectMedModalOpen, setIsSelectMedModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Invoice details state
    const [invoiceNo] = useState('INV-2026-009');
    const [invoiceDate, setInvoiceDate] = useState('2026-06-28');
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [paymentStatus, setPaymentStatus] = useState('Paid');
    const [combinedUpiAmount, setCombinedUpiAmount] = useState('');
    const [combinedCashAmount, setCombinedCashAmount] = useState('');
    const [partialAmount, setPartialAmount] = useState('');


    // Line items state
    const [items, setItems] = useState([
        { id: 1, description: 'Dolo 650mg Tablet (Strip of 15)', batch: 'DL2026A', qty: 20, price: 30.50 },
        { id: 2, description: 'Azithromycin 500mg Tablet (Strip of 5)', batch: 'AZ9981B', qty: 5, price: 115.00 }
    ]);

    // Filter parties based on search input
    const filteredParties = parties.filter(party => 
        party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        party.contact.includes(searchQuery) ||
        (party.registrationNo && party.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const selectedParty = parties.find(p => p.id === Number(selectedPartyId));

    const handleAddPartySave = (newPartyData) => {
        const newId = parties.length > 0 ? Math.max(...parties.map(p => p.id)) + 1 : 1;
        const partyObj = { id: newId, ...newPartyData };
        setParties([...parties, partyObj]);
        setSelectedPartyId(newId);
    };

    const handleAddItem = () => {
        setIsSelectMedModalOpen(true);
    };

    const handleMedicineSelect = (medicine) => {
        const existingItemIndex = items.findIndex(i => i.description === medicine.name && i.batch === medicine.batch);
        if (existingItemIndex > -1) {
            setItems(items.map((item, idx) => 
                idx === existingItemIndex ? { ...item, qty: item.qty + 1 } : item
            ));
        } else {
            if (items.length === 1 && items[0].description.trim() === '' && items[0].price === 0) {
                setItems([{ id: items[0].id, description: medicine.name, batch: medicine.batch, qty: 1, price: medicine.price }]);
            } else {
                const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
                setItems([...items, { id: newId, description: medicine.name, batch: medicine.batch, qty: 1, price: medicine.price }]);
            }
        }
    };

    const handleRemoveItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updatedVal = (field === 'description' || field === 'batch') ? value : Number(value) || 0;
                return { ...item, [field]: updatedVal };
            }
            return item;
        }));
    };

    const subtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const taxAmount = subtotal * 0.05; // 5% GST estimate
    const grandTotal = subtotal + taxAmount;

    const handleGenerateInvoice = (e) => {
        e.preventDefault();
        if (!selectedPartyId) {
            alert('Please select a wholesale party first.');
            return;
        }
        setIsSuccess(true);
        setTimeout(() => {
            if (setActivePath) {
                setActivePath('/inventory/wholesale-invoices');
            }
        }, 1800);
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMobileOpen && setMobileOpen(true)}
                        className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
                    >
                        <FiMenu size={24} />
                    </button>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setActivePath && setActivePath('/inventory/wholesale-billing')}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            title="Back to Wholesale Billing"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                Generate Bill / Invoice
                            </h1>
                            <p className="text-xs text-gray-500">Create a new wholesale invoice for your clients</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-6">
                <form onSubmit={handleGenerateInvoice} className="max-w-5xl mx-auto space-y-6">
                    
                    {/* Success Alert */}
                    {isSuccess && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-3 animate-fade-in shadow-sm">
                            <FiCheckCircle className="text-emerald-600 shrink-0" size={24} />
                            <div>
                                <h4 className="font-semibold text-sm">Invoice Generated Successfully!</h4>
                                <p className="text-xs text-emerald-700 mt-0.5">Redirecting to invoices directory...</p>
                            </div>
                        </div>
                    )}

                    {/* Top Row: Party Selection & Metadata */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left 2 Cols: Party Selection */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <h2 className="text-base font-semibold text-gray-900">1. Select Wholesale Party</h2>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-semibold transition-colors border border-indigo-200"
                                >
                                    <FiPlus size={14} />
                                    Add New Party
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <FiSearch className="absolute left-3.5 top-3 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search party by name, contact or registration no..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Choose from List <span className="text-red-500">*</span></label>
                                    <select
                                        value={selectedPartyId}
                                        onChange={(e) => setSelectedPartyId(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">-- Select a Party --</option>
                                        {filteredParties.map(party => (
                                            <option key={party.id} value={party.id}>
                                                {party.name} {party.registrationNo ? `(${party.registrationNo})` : ''} - {party.contact}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Party Summary Card */}
                            {selectedParty && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-2 animate-fade-in">
                                    <div className="flex justify-between items-start">
                                        <span className="font-bold text-gray-900 text-base">{selectedParty.name}</span>
                                        {selectedParty.registrationNo && (
                                            <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono text-gray-600">
                                                {selectedParty.registrationNo}
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                                        <div><span className="font-semibold text-gray-700">Contact:</span> {selectedParty.contact}</div>
                                        <div><span className="font-semibold text-gray-700">Email:</span> {selectedParty.email || 'N/A'}</div>
                                        <div className="sm:col-span-2"><span className="font-semibold text-gray-700">Address:</span> {selectedParty.address || 'N/A'}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Col: Invoice Metadata */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">2. Invoice Details</h2>
                            
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Number</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={invoiceNo}
                                        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono text-gray-700 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="UPI">UPI</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Combined">Combined</option>
                                    </select>
                                </div>



                                {paymentMethod === 'Combined' && (
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">UPI Amount (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={combinedUpiAmount}
                                                onChange={(e) => setCombinedUpiAmount(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Cash Amount (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={combinedCashAmount}
                                                onChange={(e) => setCombinedCashAmount(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Line Items Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="text-base font-semibold text-gray-900">3. Items & Billing</h2>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md text-xs font-semibold transition-colors shadow-sm"
                            >
                                <FiPlus size={14} />
                                Add Item
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-6 py-3 w-12">#</th>
                                        <th className="px-6 py-3">Item Description</th>
                                        <th className="px-6 py-3 w-32">Batch No.</th>
                                        <th className="px-6 py-3 w-28">No</th>
                                        <th className="px-6 py-3 w-36">Unit Price (₹)</th>
                                        <th className="px-6 py-3 w-36 text-right">Total (₹)</th>
                                        <th className="px-6 py-3 w-16 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-3 text-gray-400 font-mono text-xs">{index + 1}</td>
                                            <td className="px-6 py-3 font-medium text-gray-900">
                                                {item.description || <span className="text-gray-400 italic">Select item...</span>}
                                            </td>
                                            <td className="px-6 py-3">
                                                <select
                                                    value={item.batch || ''}
                                                    onChange={(e) => handleItemChange(item.id, 'batch', e.target.value)}
                                                    className="w-full px-2 py-1.5 bg-white border border-gray-300 text-gray-700 font-mono text-xs rounded focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                                >
                                                    <option value={item.batch}>{item.batch || 'N/A'}</option>
                                                    {item.batch && <option value={`${item.batch}-B2`}>{item.batch}-B2</option>}
                                                    {item.batch && <option value={`${item.batch}-B3`}>{item.batch}-B3</option>}
                                                </select>
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="number"
                                                    required
                                                    min="1"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-3 font-medium text-gray-700">
                                                ₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-3 text-right font-semibold text-gray-900">
                                                ₹{(item.qty * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    disabled={items.length === 1}
                                                    className={`p-1.5 rounded transition-colors ${items.length === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                                    title="Delete row"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Section: Notes & Calculation Summary */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* Payment Status */}
                        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4 flex flex-col justify-center">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Status</label>
                                <select
                                    value={paymentStatus}
                                    onChange={(e) => setPaymentStatus(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Partially Paid">Partially Paid</option>
                                </select>
                            </div>
                            
                            {paymentStatus === 'Partially Paid' && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">Amount Paid (₹)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={partialAmount}
                                        onChange={(e) => setPartialAmount(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Enter amount paid"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Totals Box */}
                        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3 flex flex-col justify-center">
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-medium text-gray-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Estimated GST (5%)</span>
                                <span className="font-medium text-gray-900">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-3 flex justify-between items-baseline">
                                <span className="text-base font-bold text-gray-900">Grand Total</span>
                                <span className="text-xl font-extrabold text-indigo-600">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setActivePath && setActivePath('/inventory/wholesale-billing')}
                            className="px-5 py-2.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPreviewModalOpen(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-sm font-semibold hover:bg-indigo-100 transition-colors shadow-sm"
                        >
                            <FiPrinter size={16} />
                            Preview Tax Invoice (B.R Format)
                        </button>
                        <button
                            type="submit"
                            disabled={isSuccess}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/30"
                        >
                            <FiCheckCircle size={16} />
                            Generate & Save Invoice
                        </button>
                    </div>
                </form>
            </main>

            {/* Add Party Modal */}
            <AddWholesalePartyModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddPartySave}
            />

            {/* Select Medicine Modal */}
            <SelectMedicineModal
                isOpen={isSelectMedModalOpen}
                onClose={() => setIsSelectMedModalOpen(false)}
                onSelect={handleMedicineSelect}
                existingItemNames={items.map(i => i.description)}
            />

            {/* Pharma Invoice Preview Modal */}
            <PharmaInvoiceModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                invoice={{
                    invoiceNo,
                    date: invoiceDate,
                    paymentMethod,
                    party: selectedParty || { name: 'DR.BASHEER MBBS / SHIFA CLINIC', address: 'KILIMINOOR, THIRUVANANTHAPURAM - 695601', contact: '9447411778', id: 373 },
                    items: items.filter(i => i.description && i.description.trim() !== '')
                }}
            />
        </div>
    );
}
