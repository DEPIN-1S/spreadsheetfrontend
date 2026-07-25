import React, { useState, useEffect } from 'react';
import { FiMenu, FiArrowLeft, FiPlus, FiTrash2, FiPrinter, FiCheckCircle, FiSearch, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import AddRetailPartyModal from '../Components/AddRetailPartyModal';
import SelectMedicineModal from '../Components/SelectMedicineModal';
import PharmaInvoiceModal from '../Components/PharmaInvoiceModal';
import { invPartiesApi, invInvoicesApi } from '../api/inventoryApiClient';

export default function GenerateRetailInvoice({ setMobileOpen, setActivePath }) {
    const [parties, setParties] = useState([]);
    const [editInvoiceId, setEditInvoiceId] = useState(null);
    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSelectMedModalOpen, setIsSelectMedModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Invoice details state
    const [invoiceNo, setInvoiceNo] = useState('INV-RET-PENDING');
    const [invoiceDate, setInvoiceDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [paymentStatus, setPaymentStatus] = useState('Paid');
    const [combinedUpiAmount, setCombinedUpiAmount] = useState('');
    const [combinedCashAmount, setCombinedCashAmount] = useState('');
    const [partialAmount, setPartialAmount] = useState('');
    const [gstRate, setGstRate] = useState(5);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Additional Charges state
    const [additionalCharges, setAdditionalCharges] = useState([
        { id: 1, name: 'Other Charges', amount: 0, gstRate: 18 }
    ]);
    const [discountPercent, setDiscountPercent] = useState('0');
    const [discountAmount, setDiscountAmount] = useState('0');
    const [roundOffType, setRoundOffType] = useState('+');
    const [roundOffValue, setRoundOffValue] = useState(0);
    const [isChargesExpanded, setIsChargesExpanded] = useState(true);

    // Line items state
    const [items, setItems] = useState([
        { id: 1, description: '', batch: '', qty: 0, price: 0, invCcRowId: null }
    ]);

    useEffect(() => {
        fetchParties();

        const checkEditMode = async () => {
            const editId = localStorage.getItem('edit_invoice_id');
            if (editId) {
                setEditInvoiceId(editId);
                try {
                    const res = await invInvoicesApi.get(editId);
                    const inv = res.data.data;
                    if (inv) {
                        setSelectedPartyId(inv.partyId || '');
                        setInvoiceDate(inv.invoiceDate);
                        setPaymentMethod(inv.paymentMethod || 'Cash');
                        setPaymentStatus(inv.paymentStatus || 'Paid');
                        if (inv.combinedUpiAmount) setCombinedUpiAmount(String(inv.combinedUpiAmount));
                        if (inv.combinedCashAmount) setCombinedCashAmount(String(inv.combinedCashAmount));
                        if (inv.paymentStatus === 'Partially Paid') {
                            setPartialAmount(String(parseFloat(inv.grandTotal || 0) - parseFloat(inv.pendingAmount || 0)));
                        }
                        if (inv.items && inv.items.length > 0) {
                            setItems(inv.items.map((item, idx) => ({
                                id: idx + 1,
                                description: item.description || '',
                                batch: item.batch || '',
                                qty: parseFloat(item.qty || 0),
                                price: parseFloat(item.price || 0),
                                invCcRowId: item.invCcRowId || null
                            })));
                        }
                    }
                } catch (error) {
                    console.error("Failed to load invoice for editing:", error);
                }
            }
        };
        checkEditMode();

        return () => {
            localStorage.removeItem('edit_invoice_id');
        };
    }, []);

    const fetchParties = async () => {
        try {
            const res = await invPartiesApi.list('retail');
            setParties(res.data.data || []);
        } catch (error) {
            console.error("Failed to load retail parties:", error);
        }
    };

    // Filter parties based on search input
    const filteredParties = parties.filter(party => 
        (party.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (party.contact || '').includes(searchQuery)
    );

    const selectedParty = parties.find(p => String(p.id) === String(selectedPartyId));

    const handleAddPartySave = async (newPartyData) => {
        try {
            const res = await invPartiesApi.create('retail', newPartyData);
            const created = res.data.data;
            setParties([...parties, created]);
            setSelectedPartyId(created.id);
        } catch (error) {
            console.error("Failed to add party:", error);
        }
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
                setItems([{ id: items[0].id, description: medicine.name, batch: medicine.batch, qty: 1, price: medicine.price, invCcRowId: medicine.ccRowId }]);
            } else {
                const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
                setItems([...items, { id: newId, description: medicine.name, batch: medicine.batch, qty: 1, price: medicine.price, invCcRowId: medicine.ccRowId }]);
            }
        }
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
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

    const itemSubtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const taxAmount = itemSubtotal * (gstRate / 100);
    const taxableSubtotal = Math.max(0, itemSubtotal - taxAmount);
    const subtotal = taxableSubtotal;
    const totalAdditionalCharges = additionalCharges.reduce((acc, chg) => acc + (Number(chg.amount) || 0), 0);
    const subtotalWithCharges = taxableSubtotal + totalAdditionalCharges;
    const effectiveDiscount = Number(discountAmount) || 0;
    const roundOffSign = roundOffType === '-' ? -1 : 1;
    const effectiveRoundOff = (Number(roundOffValue) || 0) * roundOffSign;
    const grandTotal = Math.max(0, subtotalWithCharges - effectiveDiscount + effectiveRoundOff);

    const handleGenerateInvoice = async (e) => {
        e.preventDefault();
        if (!selectedPartyId) {
            alert('Please select a customer / party first.');
            return;
        }

        const validItems = items.filter(i => i.description && i.description.trim() !== '');
        if (validItems.length === 0) {
            alert('Please add at least one item.');
            return;
        }

        const pendingAmt = paymentStatus === 'Paid' ? 0 : (paymentStatus === 'Partially Paid' ? (grandTotal - (Number(partialAmount) || 0)) : grandTotal);

        const payload = {
            type: 'retail',
            partyId: selectedPartyId,
            partyType: 'retail',
            partyName: selectedParty?.name || '',
            invoiceDate,
            items: validItems,
            itemSubtotal,
            subtotal: taxableSubtotal,
            taxAmount,
            gstRate,
            grandTotal,
            paymentMethod,
            paymentStatus,
            pendingAmount: pendingAmt,
            combinedUpiAmount: Number(combinedUpiAmount) || 0,
            combinedCashAmount: Number(combinedCashAmount) || 0,
            notes: ''
        };

        try {
            let res;
            if (editInvoiceId) {
                res = await invInvoicesApi.update(editInvoiceId, payload);
            } else {
                res = await invInvoicesApi.create(payload);
            }
            setInvoiceNo(res.data.invoiceNo || (editInvoiceId ? 'INV-RET-UPDATED' : 'INV-RET-GENERATED'));
            setIsSuccess(true);
            setTimeout(() => {
                if (setActivePath) {
                    setActivePath('/inventory/retail-invoices');
                }
            }, 1800);
        } catch (error) {
            console.error("Failed to save retail invoice:", error);
            alert("Failed to save invoice: " + (error.response?.data?.message || error.message));
        }
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
                            onClick={() => setActivePath && setActivePath('/inventory/retail-billing')}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            title="Back to Retail Billing"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                {editInvoiceId ? 'Edit Retail Bill / Invoice' : 'Generate Retail Bill / Invoice'}
                            </h1>
                            <p className="text-xs text-gray-500">
                                {editInvoiceId ? 'Update details and quantities of the retail invoice' : 'Create a new retail invoice for your walk-in customers or clinics'}
                            </p>
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
                                <h4 className="font-semibold text-sm">
                                    {editInvoiceId ? 'Retail Invoice Updated Successfully!' : 'Retail Invoice Generated Successfully!'}
                                </h4>
                                <p className="text-xs text-emerald-700 mt-0.5">Redirecting to retail invoices directory...</p>
                            </div>
                        </div>
                    )}

                    {/* Top Row: Party Selection & Metadata */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left 2 Cols: Party Selection */}
                        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                                <h2 className="text-base font-semibold text-gray-900">1. Select Customer / Party</h2>
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-semibold transition-colors border border-indigo-200"
                                >
                                    <FiPlus size={14} />
                                    Add New Customer
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <FiSearch className="absolute left-3.5 top-3 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search customer by name or contact..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && filteredParties.length > 0) {
                                                e.preventDefault();
                                                setSelectedPartyId(filteredParties[0].id);
                                                setSearchQuery(filteredParties[0].name);
                                                setShowSuggestions(false);
                                            }
                                        }}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    />

                                    {/* Auto-suggestions Dropdown */}
                                    {showSuggestions && searchQuery.trim() !== '' && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
                                            {filteredParties.length > 0 ? (
                                                filteredParties.map(party => (
                                                    <div
                                                        key={party.id}
                                                        onClick={() => {
                                                            setSelectedPartyId(party.id);
                                                            setSearchQuery(party.name);
                                                            setShowSuggestions(false);
                                                        }}
                                                        className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm border-b border-gray-100 last:border-0 flex justify-between items-center transition-colors"
                                                    >
                                                        <div>
                                                            <span className="font-semibold text-gray-900">{party.name}</span>
                                                            <div className="text-xs text-gray-500">{party.contact} {party.email ? `• ${party.email}` : ''}</div>
                                                        </div>
                                                        <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Select</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    No customer found matching "{searchQuery}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Choose from List <span className="text-red-500">*</span></label>
                                    <select
                                        value={selectedPartyId}
                                        onChange={(e) => setSelectedPartyId(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="">-- Select Customer / Party --</option>
                                        {filteredParties.map(party => (
                                            <option key={party.id} value={party.id}>
                                                {party.name} - {party.contact}
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
                                        <option value="Cash">Cash</option>
                                        <option value="UPI">UPI</option>
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
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                                                No items added yet.{' '}
                                                <button
                                                    type="button"
                                                    onClick={handleAddItem}
                                                    className="font-semibold text-indigo-600 hover:underline"
                                                >
                                                    Click + Add Item
                                                </button>{' '}
                                                to select medicines for this invoice.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item, index) => (
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
                                                        className="p-1.5 rounded transition-colors text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                                        title="Delete item"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
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

                        {/* Additional Charges & Totals Box */}
                        <div className="lg:col-span-5 bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
                            
                            {/* Header with expand/collapse and (+) add button */}
                            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                                <button
                                    type="button"
                                    onClick={() => setIsChargesExpanded(!isChargesExpanded)}
                                    className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wider hover:text-indigo-600 transition-colors"
                                >
                                    {isChargesExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                    <span>ADD ADDITIONAL CHARGES</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAdditionalCharges([...additionalCharges, { id: Date.now(), name: 'Shipping Charges', amount: 0, gstRate: 18 }])}
                                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                    title="Add Additional Charge"
                                >
                                    <FiPlus size={16} />
                                </button>
                            </div>

                            {/* Dynamic Charges List */}
                            {isChargesExpanded && (
                                <div className="space-y-3 py-1 text-sm">
                                    {additionalCharges.map(chg => (
                                        <div key={chg.id} className="grid grid-cols-12 items-center gap-1.5">
                                            <div className="col-span-1 flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setAdditionalCharges(additionalCharges.filter(c => c.id !== chg.id))}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Remove charge"
                                                >
                                                    <FiX size={16} />
                                                </button>
                                            </div>
                                            <div className="col-span-7">
                                                <input
                                                    type="text"
                                                    value={chg.name}
                                                    onChange={(e) => setAdditionalCharges(additionalCharges.map(c => c.id === chg.id ? { ...c, name: e.target.value } : c))}
                                                    className="w-full px-1 py-1 border-b border-gray-300 focus:border-indigo-500 outline-none text-gray-800 text-sm font-medium transition-colors"
                                                    placeholder="Charge name (e.g. Courier / Other)"
                                                />
                                            </div>
                                            <div className="col-span-4 flex items-center justify-end border-b border-gray-300 py-1">
                                                <span className="text-gray-400 text-xs mr-1">₹</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={chg.amount}
                                                    onChange={(e) => setAdditionalCharges(additionalCharges.map(c => c.id === chg.id ? { ...c, amount: Number(e.target.value) || 0 } : c))}
                                                    className="w-20 text-right text-sm font-semibold text-gray-800 outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    ))}

                                    {/* Discount After Tax */}
                                    <div className="grid grid-cols-12 items-center gap-1.5 pt-1 border-t border-gray-100">
                                        <div className="col-span-1 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => { setDiscountPercent('0'); setDiscountAmount('0'); }}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Clear discount"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        </div>
                                        <div className="col-span-5 font-medium text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                            Discount After Tax
                                        </div>
                                        <div className="col-span-3 flex items-center justify-end border-b border-gray-300 py-1">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={discountPercent}
                                                onChange={(e) => {
                                                    const pct = e.target.value;
                                                    setDiscountPercent(pct);
                                                    const val = (Number(pct) || 0);
                                                    const calcAmt = ((subtotalWithCharges * val) / 100).toFixed(1);
                                                    setDiscountAmount(calcAmt);
                                                }}
                                                className="w-12 text-right text-sm font-semibold outline-none"
                                            />
                                            <span className="text-gray-500 text-xs font-bold ml-1">%</span>
                                        </div>
                                        <div className="col-span-3 flex items-center justify-end border-b border-gray-300 py-1">
                                            <span className="text-gray-400 text-xs mr-1">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={discountAmount}
                                                onChange={(e) => {
                                                    const amt = e.target.value;
                                                    setDiscountAmount(amt);
                                                    const val = (Number(amt) || 0);
                                                    if (subtotalWithCharges > 0) {
                                                        const calcPct = ((val / subtotalWithCharges) * 100).toFixed(2);
                                                        setDiscountPercent(calcPct);
                                                    }
                                                }}
                                                className="w-16 text-right text-sm font-semibold text-gray-800 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Round Off */}
                                    <div className="grid grid-cols-12 items-center gap-1.5 pt-1">
                                        <div className="col-span-1 flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setRoundOffValue(0)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                title="Clear round off"
                                            >
                                                <FiX size={16} />
                                            </button>
                                        </div>
                                        <div className="col-span-5 font-medium text-gray-700 text-xs sm:text-sm whitespace-nowrap">
                                            Round Off
                                        </div>
                                        <div className="col-span-3 flex items-center justify-end">
                                            <div className="flex items-center bg-gray-100 rounded-full p-0.5 border border-gray-200">
                                                <button
                                                    type="button"
                                                    onClick={() => setRoundOffType('-')}
                                                    className={`w-5 h-5 rounded-full text-xs font-bold transition-all ${roundOffType === '-' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    -
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRoundOffType('+')}
                                                    className={`w-5 h-5 rounded-full text-xs font-bold transition-all ${roundOffType === '+' ? 'bg-indigo-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                        <div className="col-span-3 flex items-center justify-end border-b border-gray-300 py-1">
                                            <span className="text-gray-400 text-xs mr-1">₹</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={roundOffValue}
                                                onChange={(e) => setRoundOffValue(e.target.value)}
                                                className="w-16 text-right text-sm font-semibold text-gray-800 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Item Subtotal & Deducted GST Summary */}
                            <div className="space-y-2 pt-2 border-t border-gray-100 text-xs sm:text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Item Subtotal</span>
                                    <span className="font-semibold text-gray-900">₹{itemSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <span>Deducted GST:</span>
                                        <select
                                            value={gstRate}
                                            onChange={(e) => setGstRate(Number(e.target.value))}
                                            className="text-xs bg-gray-50 border border-gray-300 rounded px-2 py-0.5 font-medium text-gray-700 focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                                        >
                                            <option value={5}>5%</option>
                                            <option value={18}>18%</option>
                                        </select>
                                    </div>
                                    <span className="font-semibold text-red-600">- ₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {gstRate > 0 && (
                                    <div className="flex justify-between text-gray-600 pt-1 border-t border-dashed border-gray-200">
                                        <span>Net Taxable Subtotal</span>
                                        <span className="font-semibold text-indigo-700">₹{taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </div>

                            {/* Total Amount */}
                            <div className="border-t-2 border-gray-900 pt-3 flex justify-between items-baseline">
                                <span className="text-base font-bold text-gray-900">Total Amount</span>
                                <span className="text-2xl font-extrabold text-indigo-600">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setActivePath && setActivePath('/inventory/retail-billing')}
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
                            {editInvoiceId ? 'Update & Save Invoice' : 'Generate & Save Invoice'}
                        </button>
                    </div>
                </form>
            </main>

            {/* Add Party Modal */}
            <AddRetailPartyModal
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
                inventoryType="retail"
            />

            {/* Pharma Invoice Preview Modal */}
            <PharmaInvoiceModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                invoice={{
                    invoiceNo,
                    date: invoiceDate,
                    paymentMethod,
                    party: selectedParty || { name: 'John Doe (Walk-in)', address: '12 Maple St, NY', contact: '+1 (555) 111-2233', id: 201 },
                    items: items.filter(i => i.description && i.description.trim() !== ''),
                    itemSubtotal,
                    subtotal: taxableSubtotal,
                    taxAmount,
                    gstRate,
                    grandTotal
                }}
            />
        </div>
    );
}
