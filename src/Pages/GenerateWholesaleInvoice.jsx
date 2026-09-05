import React, { useState, useEffect } from 'react';
import { FiMenu, FiArrowLeft, FiPlus, FiMinus, FiTrash2, FiPrinter, FiCheckCircle, FiSearch, FiX, FiChevronDown, FiChevronUp, FiEdit, FiLoader } from 'react-icons/fi';
import Swal from 'sweetalert2';
import AddWholesalePartyModal from '../Components/AddWholesalePartyModal';
import SelectMedicineModal from '../Components/SelectMedicineModal';
import PharmaInvoiceModal from '../Components/PharmaInvoiceModal';
import { invPartiesApi, invInvoicesApi, invSheetsApi } from '../api/inventoryApiClient';
import { parseGstPercent, inclusiveGstAmount, loadProductGstMap } from '../utils/gst';

export default function GenerateWholesaleInvoice({ setMobileOpen, setActivePath }) {
    const [parties, setParties] = useState([]);
    const [editInvoiceId, setEditInvoiceId] = useState(null);
    const [selectedPartyId, setSelectedPartyId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSelectMedModalOpen, setIsSelectMedModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Invoice details state
    const [invoiceNo, setInvoiceNo] = useState('INV-WH-PENDING');
    const [invoiceDate, setInvoiceDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [paymentStatus, setPaymentStatus] = useState('Paid');
    const [combinedUpiAmount, setCombinedUpiAmount] = useState('');
    const [combinedCashAmount, setCombinedCashAmount] = useState('');
    const [partialAmount, setPartialAmount] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Additional Charges state
    const [additionalCharges, setAdditionalCharges] = useState([
        { id: 1, name: 'Other Charges', amount: 0, gstRate: 18 }
    ]);
    const [discountPercent, setDiscountPercent] = useState('0');
    const [discountAmount, setDiscountAmount] = useState('0');
    const [roundOffType, setRoundOffType] = useState('+');
    const [roundOffValue, setRoundOffValue] = useState('0');
    const [isChargesExpanded, setIsChargesExpanded] = useState(true);

    // Line items state
    const [items, setItems] = useState([
        { id: 1, description: '', batch: '', qty: 0, price: 0, invCcRowId: null }
    ]);

    const fetchParties = async () => {
        try {
            const res = await invPartiesApi.list('wholesale');
            setParties(res.data.data || []);
        } catch (error) {
            console.error("Failed to load wholesale parties:", error);
        }
    };

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
                        setPaymentMethod(inv.paymentMethod || 'UPI');
                        setPaymentStatus(inv.paymentStatus || 'Paid');
                        if (inv.combinedUpiAmount) setCombinedUpiAmount(String(inv.combinedUpiAmount));
                        if (inv.combinedCashAmount) setCombinedCashAmount(String(inv.combinedCashAmount));
                        if (inv.paymentStatus === 'Partially Paid') {
                            setPartialAmount(String(parseFloat(inv.grandTotal || 0) - parseFloat(inv.pendingAmount || 0)));
                        }
                        if (inv.discountAmount) setDiscountAmount(String(inv.discountAmount));
                        // additionalCharges may come back as a JSON string from the API — parse it
                        const parsedCharges = (() => {
                            if (!inv.additionalCharges) return null;
                            if (Array.isArray(inv.additionalCharges)) return inv.additionalCharges;
                            try { return JSON.parse(inv.additionalCharges); } catch { return null; }
                        })();
                        if (parsedCharges && Array.isArray(parsedCharges) && parsedCharges.length > 0) setAdditionalCharges(parsedCharges);
                        if (inv.roundOffAmount !== undefined && inv.roundOffAmount !== null) {
                            const ro = parseFloat(inv.roundOffAmount) || 0;
                            if (ro < 0) {
                                setRoundOffType('-');
                                setRoundOffValue(String(Math.abs(ro)));
                            } else {
                                setRoundOffType('+');
                                setRoundOffValue(String(ro));
                            }
                        }
                        if (inv.items && inv.items.length > 0) {
                            setItems(inv.items.map((item, idx) => ({
                                id: idx + 1,
                                description: item.description || '',
                                batch: item.batch || '',
                                expiry: item.expiry || '',
                                qty: parseFloat(item.qty || 0),
                                price: parseFloat(item.price || 0),
                                mrp: parseFloat(item.mrp || 0),
                                gstPercent: parseGstPercent(item.gstPercent ?? item.gst),
                                disPercent: parseFloat(item.disPercent || item.marginPercent || item.discount || 0),
                                marginPercent: parseFloat(item.marginPercent || item.disPercent || 0),
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

    useEffect(() => {
        const needsGst = items.some(i => i.description && !parseGstPercent(i.gstPercent));
        if (!needsGst) return;
        Promise.all([invSheetsApi.listAllBatches(), loadProductGstMap(invSheetsApi)]).then(([res, gstByName]) => {
            const batches = res.data.data || [];
            setItems(prev => {
                let changed = false;
                const next = prev.map(item => {
                    if (parseGstPercent(item.gstPercent) > 0) return item;
                    const match = batches.find(b =>
                        b.ccRowId === item.invCcRowId
                        || (b.name?.trim() === item.description?.trim() && String(b.batch || '').trim() === String(item.batch || '').trim())
                    );
                    const gstPercent = parseGstPercent(match?.gstPercent ?? match?.gst)
                        || gstByName[String(item.description || '').trim().toLowerCase()]
                        || 0;
                    if (!gstPercent) return item;
                    changed = true;
                    return { ...item, gstPercent };
                });
                return changed ? next : prev;
            });
        }).catch(() => {});
    }, [items]);

    // Filter parties based on search input
    const filteredParties = parties.filter(party => 
        (party.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (party.contact || '').includes(searchQuery) ||
        (party.registrationNo && party.registrationNo.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const selectedParty = parties.find(p => String(p.id) === String(selectedPartyId));

    const handleAddPartySave = async (newPartyData) => {
        try {
            const res = await invPartiesApi.create('wholesale', newPartyData);
            const created = res.data.data;
            setParties([...parties, created]);
            setSelectedPartyId(created.id);
        } catch (error) {
            console.error("Failed to add wholesale party:", error);
            throw error;
        }
    };

    const handleEditPartySave = async (updatedData) => {
        try {
            const res = await invPartiesApi.update('wholesale', selectedParty.id, updatedData);
            const updated = res.data.data || { ...selectedParty, ...updatedData };
            setParties(parties.map(p => String(p.id) === String(selectedParty.id) ? updated : p));
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to update wholesale party:", error);
            throw error;
        }
    };

    const handleAddItem = () => {
        setIsSelectMedModalOpen(true);
    };

    const handleMedicineSelect = (medicine) => {
        const gstPercent = parseGstPercent(medicine.gstPercent ?? medicine.gst);
        const existingItemIndex = items.findIndex(i => i.description === medicine.name && i.batch === medicine.batch);
        if (existingItemIndex > -1) {
            setItems(items.map((item, idx) => 
                idx === existingItemIndex
                    ? { ...item, qty: Number(item.qty || 0) + 1, gstPercent: parseGstPercent(item.gstPercent) || gstPercent }
                    : item
            ));
        } else {
            if (items.length === 1 && items[0].description.trim() === '' && items[0].price === 0) {
                setItems([{ id: items[0].id, description: medicine.name, batch: medicine.batch, expiry: medicine.expiry || '08/28', qty: 1, price: medicine.price, mrp: medicine.mrp || 0, gstPercent, disPercent: medicine.wholesaleMargin || 0, marginPercent: medicine.wholesaleMargin || 0, invCcRowId: medicine.ccRowId }]);
            } else {
                const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
                setItems([...items, { id: newId, description: medicine.name, batch: medicine.batch, expiry: medicine.expiry || '08/28', qty: 1, price: medicine.price, mrp: medicine.mrp || 0, gstPercent, disPercent: medicine.wholesaleMargin || 0, marginPercent: medicine.wholesaleMargin || 0, invCcRowId: medicine.ccRowId }]);
            }
        }
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updatedVal = (field === 'description' || field === 'batch' || field === 'expiry') ? value : Number(value) || 0;
                return { ...item, [field]: updatedVal };
            }
            return item;
        }));
    };

    const itemSubtotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const taxAmount = items.reduce((acc, item) => acc + inclusiveGstAmount(item.qty * item.price, parseGstPercent(item.gstPercent)), 0);
    const taxableSubtotal = Math.max(0, itemSubtotal - taxAmount);
    const gstRate = parseGstPercent(items.find(i => i.description && parseGstPercent(i.gstPercent) > 0)?.gstPercent);
    // Additional Charges (GST INCLUDED in amount)
    const totalAdditionalCharges = additionalCharges.reduce((acc, chg) => acc + (Number(chg.amount) || 0), 0);
    const totalAdditionalChargesTax = additionalCharges.reduce((acc, chg) => {
        const amt = Number(chg.amount) || 0;
        const rate = Number(chg.gstRate) || 0;
        return acc + (rate > 0 ? (amt - (amt / (1 + rate / 100))) : 0);
    }, 0);
    const totalAdditionalChargesBase = totalAdditionalCharges - totalAdditionalChargesTax;

    const subtotalWithCharges = itemSubtotal + totalAdditionalCharges;
    const effectiveDiscount = Number(discountAmount) || 0;
    const roundOffSign = roundOffType === '-' ? -1 : 1;
    const effectiveRoundOff = (parseFloat(roundOffValue) || 0) * roundOffSign;
    const grandTotal = Math.max(0, subtotalWithCharges - effectiveDiscount + effectiveRoundOff);

    const handleGenerateInvoice = async (e) => {
        e.preventDefault();
        if (isSubmitting || isSuccess) return;

        if (!selectedPartyId) {
            Swal.fire({
                icon: 'warning',
                title: 'Party Required',
                text: 'Please select a wholesale party first.',
                confirmButtonColor: '#4F46E5',
                customClass: { popup: 'rounded-2xl' }
            });
            return;
        }

        const validItems = items.filter(i => i.description && i.description.trim() !== '');
        if (validItems.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Items Required',
                text: 'Please add at least one item to the invoice.',
                confirmButtonColor: '#4F46E5',
                customClass: { popup: 'rounded-2xl' }
            });
            return;
        }

        setIsSubmitting(true);
        const pendingAmt = paymentStatus === 'Paid' ? 0 : (paymentStatus === 'Partially Paid' ? (grandTotal - (Number(partialAmount) || 0)) : grandTotal);

        const payload = {
            type: 'wholesale',
            partyId: selectedPartyId,
            partyType: 'wholesale',
            partyName: selectedParty?.name || '',
            billingAddress: selectedParty?.billingAddress || selectedParty?.address || '',
            shippingAddress: selectedParty?.shippingAddress || selectedParty?.billingAddress || selectedParty?.address || '',
            invoiceDate,
            items: validItems,
            itemSubtotal,
            subtotal: taxableSubtotal,
            taxAmount,
            gstRate,
            discountAmount: effectiveDiscount,
            additionalChargesAmount: totalAdditionalCharges,
            additionalCharges: additionalCharges,
            roundOffAmount: effectiveRoundOff,
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
            const generatedNo = res.data.invoiceNo || (editInvoiceId ? 'INV-WH-UPDATED' : 'INV-WH-GENERATED');
            setInvoiceNo(generatedNo);
            setIsSuccess(true);
            Swal.fire({
                icon: 'success',
                title: editInvoiceId ? 'Invoice Updated!' : 'Invoice Generated!',
                text: `Wholesale Invoice ${generatedNo} saved successfully.`,
                timer: 1800,
                showConfirmButton: false,
                customClass: { popup: 'rounded-2xl' }
            });
            setTimeout(() => {
                if (setActivePath) {
                    const returnPath = localStorage.getItem('return_path_invoice') || '/inventory/wholesale-invoices';
                    localStorage.removeItem('return_path_invoice');
                    setActivePath(returnPath);
                }
            }, 1800);
        } catch (error) {
            console.error("Failed to save wholesale invoice:", error);
            Swal.fire({
                icon: 'error',
                title: 'Failed to Save Invoice',
                text: error.response?.data?.message || error.message || 'An error occurred while saving the invoice.',
                confirmButtonColor: '#4F46E5',
                customClass: { popup: 'rounded-2xl' }
            });
            setIsSubmitting(false);
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
                            onClick={() => setActivePath && setActivePath('/inventory/wholesale-billing')}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            title="Back to Wholesale Billing"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                {editInvoiceId ? 'Edit Wholesale Bill / Invoice' : 'Generate Wholesale Bill / Invoice'}
                            </h1>
                            <p className="text-xs text-gray-500">
                                {editInvoiceId ? 'Update details and quantities of the wholesale invoice' : 'Create a new wholesale invoice for your clients'}
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
                                    {editInvoiceId ? 'Wholesale Invoice Updated Successfully!' : 'Wholesale Invoice Generated Successfully!'}
                                </h4>
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
                                <div className="flex items-center gap-2">
                                    {selectedParty && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md text-xs font-semibold transition-colors border border-amber-200"
                                            title="Edit selected party details"
                                        >
                                            <FiEdit size={14} />
                                            Edit Party
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-semibold transition-colors border border-indigo-200"
                                    >
                                        <FiPlus size={14} />
                                        Add New Party
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="relative">
                                    <FiSearch className="absolute left-3.5 top-3 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search party by name, contact or registration no..."
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
                                                            <div className="text-xs text-gray-500">{party.contact} {party.registrationNo ? `• Reg: ${party.registrationNo}` : ''}</div>
                                                        </div>
                                                        <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Select</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    No party found matching "{searchQuery}"
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
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditModalOpen(true)}
                                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded text-xs font-semibold transition-colors"
                                                title="Edit party information"
                                            >
                                                <FiEdit size={13} />
                                                Edit
                                            </button>
                                            {selectedParty.registrationNo && (
                                                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs font-mono text-gray-600">
                                                    {selectedParty.registrationNo}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                                        <div><span className="font-semibold text-gray-700">Contact:</span> {selectedParty.contact}</div>
                                        <div><span className="font-semibold text-gray-700">Email:</span> {selectedParty.email || 'N/A'}</div>
                                        <div className="sm:col-span-2">
                                            <span className="font-semibold text-gray-700">Billing Address:</span>{' '}
                                            {selectedParty.billingAddress || selectedParty.address || 'N/A'}
                                        </div>
                                        {selectedParty.shippingAddress && selectedParty.shippingAddress !== (selectedParty.billingAddress || selectedParty.address) && (
                                            <div className="sm:col-span-2">
                                                <span className="font-semibold text-gray-700">Shipping Address:</span>{' '}
                                                {selectedParty.shippingAddress}
                                            </div>
                                        )}
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
                        {items.some(i => i.description && !i.invCcRowId) && (
                            <div className="mx-6 mt-3 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2 text-xs text-orange-700">
                                <span className="mt-0.5">⚠️</span>
                                <span>
                                    <strong>Stock Warning:</strong> Items with an <span className="inline-block w-2 h-2 rounded-full bg-orange-400 mx-0.5 -mb-0.5" /> orange dot are <strong>not linked to inventory</strong> — their stock will NOT be automatically deducted. Use <strong>+ Add Item</strong> to select from inventory picker for proper stock tracking.
                                </span>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                        <th className="px-6 py-3 w-12">#</th>
                                        <th className="px-6 py-3">Item Description</th>
                                        <th className="px-4 py-3 w-32">Batch No.</th>
                                        <th className="px-4 py-3 w-36">Exp. Date</th>
                                        <th className="px-3 py-3 w-32 text-center">No</th>
                                        <th className="px-3 py-3 w-20 text-center">GST %</th>
                                        <th className="px-3 py-3 w-28 text-red-600">GST (₹)</th>
                                        <th className="px-6 py-3 w-36">Unit Price (₹)</th>
                                        <th className="px-6 py-3 w-36 text-right">Total (₹)</th>
                                        <th className="px-6 py-3 w-16 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-sm">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan="10" className="px-6 py-8 text-center text-gray-400">
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
                                                     <div className="flex items-center gap-2">
                                                         {item.description || <span className="text-gray-400 italic">Select item...</span>}
                                                         {item.description && !item.invCcRowId && (
                                                             <span title="Not linked to inventory — stock will NOT be deducted" className="flex-shrink-0 w-2 h-2 rounded-full bg-orange-400" />
                                                         )}
                                                         {item.description && item.invCcRowId && (
                                                             <span title="Linked to inventory — stock will be deducted" className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" />
                                                         )}
                                                     </div>
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
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        placeholder="MM/YY"
                                                        value={item.expiry || ''}
                                                        onChange={(e) => handleItemChange(item.id, 'expiry', e.target.value)}
                                                        className="w-full min-w-[6.5rem] px-2 py-1.5 bg-white border border-gray-300 text-gray-800 font-mono text-xs rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    />
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <div className="inline-flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleItemChange(item.id, 'qty', Math.max(1, (Number(item.qty) || 1) - 1))}
                                                            className="px-1.5 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                                                            title="Decrease qty"
                                                        >
                                                            <FiMinus size={14} />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            required
                                                            min="1"
                                                            value={item.qty ?? ''}
                                                            onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                                                            className="w-10 px-0.5 py-1.5 border-0 border-x border-gray-200 text-sm text-center text-gray-900 font-semibold tabular-nums focus:ring-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleItemChange(item.id, 'qty', (Number(item.qty) || 0) + 1)}
                                                            className="px-1.5 py-1.5 text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
                                                            title="Increase qty"
                                                        >
                                                            <FiPlus size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center text-gray-900 font-semibold">
                                                    {parseGstPercent(item.gstPercent) > 0 ? `${parseGstPercent(item.gstPercent)}%` : '—'}
                                                </td>
                                                <td className="px-3 py-3 text-red-600 font-semibold">
                                                    ₹{inclusiveGstAmount(item.qty * item.price, parseGstPercent(item.gstPercent)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                    {additionalCharges.map(chg => {
                                        const chgAmt = Number(chg.amount) || 0;
                                        const chgGst = Number(chg.gstRate) || 0;
                                        const chgBase = chgGst > 0 ? (chgAmt / (1 + chgGst / 100)) : chgAmt;
                                        const chgTaxAmt = chgAmt - chgBase;
                                        return (
                                            <div key={chg.id} className="space-y-1 py-1 border-b border-gray-100 last:border-0">
                                                <div className="grid grid-cols-12 items-center gap-1.5">
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
                                                    <div className="col-span-5">
                                                        <input
                                                            type="text"
                                                            value={chg.name}
                                                            onChange={(e) => setAdditionalCharges(additionalCharges.map(c => c.id === chg.id ? { ...c, name: e.target.value } : c))}
                                                            className="w-full px-1 py-1 border-b border-gray-300 focus:border-indigo-500 outline-none text-gray-800 text-sm font-medium transition-colors"
                                                            placeholder="Charge name"
                                                        />
                                                    </div>
                                                    <div className="col-span-3 flex items-center justify-end">
                                                        <select
                                                            value={chg.gstRate ?? 18}
                                                            onChange={(e) => setAdditionalCharges(additionalCharges.map(c => c.id === chg.id ? { ...c, gstRate: Number(e.target.value) } : c))}
                                                            className="text-xs bg-gray-50 border border-gray-300 rounded px-1.5 py-1 text-gray-700 font-medium focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer"
                                                            title="GST Rate for this charge"
                                                        >
                                                            <option value={5}>5% GST</option>
                                                            <option value={18}>18% GST</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-3 flex items-center justify-end border-b border-gray-300 py-1">
                                                        <span className="text-gray-400 text-xs mr-1">₹</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={chg.amount}
                                                            onChange={(e) => setAdditionalCharges(additionalCharges.map(c => c.id === chg.id ? { ...c, amount: Number(e.target.value) || 0 } : c))}
                                                            className="w-16 text-right text-sm font-semibold text-gray-800 outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                                {chgGst > 0 && chgAmt > 0 && (
                                                    <div className="flex justify-end text-[11px] font-medium pr-1 gap-2">
                                                        <span className="text-red-600">(Deducted {chgGst}% GST: - ₹{chgTaxAmt.toFixed(2)})</span>
                                                        <span className="text-gray-500">| Net Base: ₹{chgBase.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

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
                                                step="any"
                                                value={roundOffValue}
                                                onChange={(e) => setRoundOffValue(e.target.value)}
                                                className="w-16 text-right text-sm font-semibold text-gray-800 outline-none"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Item Subtotal & per-product GST Summary */}
                            <div className="space-y-2 pt-2 border-t border-gray-100 text-xs sm:text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Item Subtotal</span>
                                    <span className="font-semibold text-gray-900">₹{itemSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-center text-red-600">
                                    <span>Total GST (included)</span>
                                    <span className="font-semibold">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                {taxAmount > 0 && (
                                    <div className="flex justify-between text-gray-600 pt-1 border-t border-dashed border-gray-200">
                                        <span>Taxable value</span>
                                        <span className="font-semibold text-indigo-700">₹{taxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {totalAdditionalCharges > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>Additional Charges Total</span>
                                        <span className="font-semibold text-gray-900">+ ₹{totalAdditionalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {totalAdditionalChargesTax > 0 && (
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span>Deducted Charges GST</span>
                                        <span className="font-semibold text-red-600">- ₹{totalAdditionalChargesTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {totalAdditionalChargesBase > 0 && (
                                    <div className="flex justify-between text-gray-600 pt-1 border-t border-dashed border-gray-200">
                                        <span>Net Charges Base</span>
                                        <span className="font-semibold text-indigo-700">₹{totalAdditionalChargesBase.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                            disabled={isSubmitting || isSuccess}
                            className={`flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all focus:ring-4 focus:ring-indigo-500/30 ${isSubmitting || isSuccess ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {isSubmitting ? (
                                <>
                                    <FiLoader className="animate-spin" size={16} />
                                    {editInvoiceId ? 'Updating Invoice...' : 'Generating & Saving Invoice...'}
                                </>
                            ) : (
                                <>
                                    <FiCheckCircle size={16} />
                                    {editInvoiceId ? 'Update & Save Invoice' : 'Generate & Save Invoice'}
                                </>
                            )}
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

            {/* Edit Party Modal */}
            <AddWholesalePartyModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                initialData={selectedParty}
                onSave={handleEditPartySave}
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
                    party: selectedParty || { name: 'Wholesale Customer', address: '', contact: '', id: 373 },
                    items: items.filter(i => i.description && i.description.trim() !== ''),
                    itemSubtotal,
                    subtotal: taxableSubtotal,
                    taxAmount,
                    gstRate,
                    discountAmount: effectiveDiscount,
                    additionalChargesAmount: totalAdditionalCharges,
                    additionalCharges: additionalCharges,
                    roundOffAmount: effectiveRoundOff,
                    grandTotal
                }}
            />
        </div>
    );
}
