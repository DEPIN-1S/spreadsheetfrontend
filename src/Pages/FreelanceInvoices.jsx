import React, { useState, useEffect } from 'react';
import {
    FiPlus, FiTrash2, FiEdit2, FiEye, FiMenu, FiBriefcase,
    FiArrowLeft, FiX, FiSearch, FiMoreVertical, FiCheckCircle,
    FiUsers, FiUser, FiTag
} from 'react-icons/fi';
import AddPersonalTemplateModal from '../Components/AddPersonalTemplateModal';
import GeneratePersonalInvoiceModal from '../Components/GeneratePersonalInvoiceModal';
import PersonalPartyModal from '../Components/PersonalPartyModal';
import ViewPersonalPartyModal from '../Components/ViewPersonalPartyModal';
import { freelanceApi } from '../api/apiClient';

export default function FreelanceInvoices({ setMobileOpen, setActivePath }) {
    // Business states
    const [businesses, setBusinesses] = useState([]);
    const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(true);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [isCreateBizModalOpen, setIsCreateBizModalOpen] = useState(false);
    const [isRenameBizModalOpen, setIsRenameBizModalOpen] = useState(false);
    const [bizToRename, setBizToRename] = useState(null);
    const [businessNameInput, setBusinessNameInput] = useState('');
    const [isSavingBiz, setIsSavingBiz] = useState(false);
    const [bizSearchQuery, setBizSearchQuery] = useState('');
    const [openMenuBizId, setOpenMenuBizId] = useState(null);

    // Business subview tab: 'invoices' | 'parties'
    const [partyPage, setPartyPage] = useState(1);
    const partyPageSize = 10;

    // Parties state
    const [parties, setParties] = useState([]);
    const [isLoadingParties, setIsLoadingParties] = useState(false);
    const [partySearchQuery, setPartySearchQuery] = useState('');
    // Generic parties - no role separation
    const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
    const [partyToEdit, setPartyToEdit] = useState(null);
    const [viewingParty, setViewingParty] = useState(null);
    const [openMenuPartyId, setOpenMenuPartyId] = useState(null);

    // Invoice states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedTemplateToGenerate, setSelectedTemplateToGenerate] = useState(null);
    const [viewingInvoice, setViewingInvoice] = useState(null);
    const [editingInvoice, setEditingInvoice] = useState(null);
    const [savedInvoices, setSavedInvoices] = useState([]);
    const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const invoicePageSize = 10;
    const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');

    useEffect(() => {
        fetchBusinesses();
    }, []);

    useEffect(() => {
        if (selectedBusiness) {
            fetchInvoices(selectedBusiness.id);
            fetchParties(selectedBusiness.id);
            setPartyPage(1);
            setCurrentPage(1);
        } else {
            setSavedInvoices([]);
            setParties([]);
        }
    }, [selectedBusiness]);

    // Close open context menus on outside click
    useEffect(() => {
        const handleClickOutside = () => {
            setOpenMenuBizId(null);
            setOpenMenuPartyId(null);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchBusinesses = async () => {
        setIsLoadingBusinesses(true);
        try {
            const res = await freelanceApi.getBusinesses().catch(() => ({ data: { data: [] } }));
            if (res.data?.data) {
                setBusinesses(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch freelance businesses', err);
        } finally {
            setIsLoadingBusinesses(false);
        }
    };

    const fetchInvoices = async (businessId) => {
        setIsLoadingInvoices(true);
        try {
            const res = await freelanceApi.getInvoices(businessId).catch(() => ({ data: { data: [] } }));
            if (res.data?.data) {
                setSavedInvoices(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch invoices', err);
        } finally {
            setIsLoadingInvoices(false);
        }
    };

    const fetchParties = async (businessId) => {
        setIsLoadingParties(true);
        try {
            const res = await freelanceApi.getParties(businessId).catch(() => ({ data: { data: [] } }));
            if (res.data?.data) {
                setParties(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch parties', err);
        } finally {
            setIsLoadingParties(false);
        }
    };

    const handleSaveParty = async (partyData) => {
        if (partyToEdit) {
            const res = await freelanceApi.updateParty(partyToEdit.id, partyData);
            const updated = res.data?.data || { ...partyToEdit, ...partyData };
            setParties(prev => prev.map(p => p.id === partyToEdit.id ? updated : p));
        } else {
            const res = await freelanceApi.createParty({
                ...partyData,
                businessId: selectedBusiness.id
            });
            const created = res.data?.data || partyData;
            setParties(prev => [created, ...prev]);
            setBusinesses(prev => prev.map(b => {
                if (b.id === selectedBusiness.id) {
                    return { ...b, parties: [...(b.parties || []), created] };
                }
                return b;
            }));
        }
        setIsPartyModalOpen(false);
        setPartyToEdit(null);
    };

    const handleDeleteParty = async (party) => {
        if (!window.confirm(`Are you sure you want to delete party "${party.name}"?`)) return;
        try {
            await freelanceApi.deleteParty(party.id);
            setParties(prev => prev.filter(p => p.id !== party.id));
            setBusinesses(prev => prev.map(b => {
                if (b.id === selectedBusiness?.id) {
                    return { ...b, parties: (b.parties || []).filter(p => p.id !== party.id) };
                }
                return b;
            }));
        } catch (err) {
            console.error('Failed to delete party', err);
            alert(err.response?.data?.message || 'Failed to delete party');
        }
    };

    const handleCreateBusiness = async (e) => {
        e.preventDefault();
        if (!businessNameInput.trim() || isSavingBiz) return;
        setIsSavingBiz(true);
        try {
            const res = await freelanceApi.createBusiness({ name: businessNameInput.trim() });
            if (res.data?.data) {
                const newBiz = { ...res.data.data, invoices: [] };
                setBusinesses(prev => [newBiz, ...prev]);
                setBusinessNameInput('');
                setIsCreateBizModalOpen(false);
                // Automatically open the newly created business
                setSelectedBusiness(newBiz);
            }
        } catch (err) {
            console.error('Error creating business', err);
            alert(err.response?.data?.message || 'Failed to create business');
        } finally {
            setIsSavingBiz(false);
        }
    };

    const handleRenameBusiness = async (e) => {
        e.preventDefault();
        if (!businessNameInput.trim() || !bizToRename || isSavingBiz) return;
        setIsSavingBiz(true);
        try {
            const res = await freelanceApi.updateBusiness(bizToRename.id, { name: businessNameInput.trim() });
            const updated = res.data?.data || { ...bizToRename, name: businessNameInput.trim() };
            setBusinesses(prev => prev.map(b => b.id === bizToRename.id ? { ...b, name: updated.name } : b));
            if (selectedBusiness?.id === bizToRename.id) {
                setSelectedBusiness(prev => ({ ...prev, name: updated.name }));
            }
            setIsRenameBizModalOpen(false);
            setBizToRename(null);
            setBusinessNameInput('');
        } catch (err) {
            console.error('Error renaming business', err);
            alert(err.response?.data?.message || 'Failed to rename business');
        } finally {
            setIsSavingBiz(false);
        }
    };

    const handleDeleteBusiness = async (biz) => {
        if (!window.confirm(`Are you sure you want to delete "${biz.name}" and all its invoices?`)) return;
        try {
            await freelanceApi.deleteBusiness(biz.id);
            setBusinesses(prev => prev.filter(b => b.id !== biz.id));
            if (selectedBusiness?.id === biz.id) {
                setSelectedBusiness(null);
            }
        } catch (err) {
            console.error('Error deleting business', err);
            alert(err.response?.data?.message || 'Failed to delete business');
        }
    };

    const handleEditInvoice = (inv) => {
        if (!inv) return;
        let parsedTemplate = inv.template;
        if (typeof parsedTemplate === 'string') {
            try { parsedTemplate = JSON.parse(parsedTemplate); } catch (e) { parsedTemplate = {}; }
        }
        let parsedItems = inv.items;
        if (typeof parsedItems === 'string') {
            try { parsedItems = JSON.parse(parsedItems); } catch (e) { parsedItems = [{}]; }
        }
        let parsedTotals = inv.totals;
        if (typeof parsedTotals === 'string') {
            try { parsedTotals = JSON.parse(parsedTotals); } catch (e) { parsedTotals = {}; }
        }
        const invoiceToEdit = {
            ...inv,
            template: parsedTemplate,
            items: parsedItems,
            totals: parsedTotals
        };
        setEditingInvoice(invoiceToEdit);
        setIsGenerateModalOpen(true);
    };

    const handleDeleteInvoice = async (id) => {
        if (!window.confirm("Are you sure you want to delete this invoice?")) return;
        try {
            await freelanceApi.deleteInvoice(id);
            setSavedInvoices(prev => prev.filter(inv => inv.id !== id));
            // Update invoice count on business card
            setBusinesses(prev => prev.map(b => {
                if (b.id === selectedBusiness?.id) {
                    return { ...b, invoices: (b.invoices || []).filter(i => i.id !== id) };
                }
                return b;
            }));
        } catch (err) {
            console.error("Error deleting invoice", err);
        }
    };

    const handleConfigureInvoice = (data) => {
        setSelectedTemplateToGenerate(data);
        setIsAddModalOpen(false);
        setIsGenerateModalOpen(true);
    };

    // Filter businesses by search query
    const filteredBusinesses = businesses.filter(b =>
        (b.name || '').toLowerCase().includes(bizSearchQuery.toLowerCase())
    );

    // Filter parties by search query
    const filteredParties = parties.filter(p => {
        const query = partySearchQuery.toLowerCase().trim();
        const matchesName = (p.name || '').toLowerCase().includes(query);
        const matchesFields = Array.isArray(p.customFields) && p.customFields.some(f =>
            (f.key || '').toLowerCase().includes(query) || (f.value || '').toLowerCase().includes(query)
        );
        return !query || matchesName || matchesFields;
    });

    // Filter invoices by search query
    const filteredInvoices = savedInvoices.filter(inv => {
        const query = invoiceSearchQuery.toLowerCase();
        return (
            (inv.invoiceNo || '').toLowerCase().includes(query) ||
            (inv.clientName || '').toLowerCase().includes(query) ||
            (inv.date || '').toLowerCase().includes(query)
        );
    });

    const totalInvoicePages = Math.max(1, Math.ceil((filteredInvoices?.length || 0) / invoicePageSize));
    const paginatedInvoices = filteredInvoices.slice(
        (currentPage - 1) * invoicePageSize,
        currentPage * invoicePageSize
    );

    const totalPartyPages = Math.max(1, Math.ceil((filteredParties?.length || 0) / partyPageSize));
    const paginatedParties = filteredParties.slice(
        (partyPage - 1) * partyPageSize,
        partyPage * partyPageSize
    );

    useEffect(() => {
        if (currentPage > totalInvoicePages) {
            setCurrentPage(Math.max(1, totalInvoicePages));
        }
    }, [totalInvoicePages, currentPage]);

    useEffect(() => {
        if (partyPage > totalPartyPages) {
            setPartyPage(Math.max(1, totalPartyPages));
        }
    }, [totalPartyPages, partyPage]);

    return (
        <div className="flex-1 flex flex-col h-screen bg-slate-50 overflow-hidden relative font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
                        title="Open Sidebar"
                    >
                        <FiMenu size={24} />
                    </button>

                    {selectedBusiness ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelectedBusiness(null)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                            >
                                <FiArrowLeft size={13} />
                                <span>Businesses</span>
                            </button>
                            <span className="text-gray-300">/</span>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                                <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate max-w-xs sm:max-w-md">
                                    {selectedBusiness.name}
                                </h1>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                                Personal Invoices
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Select or create a business to manage its personal invoices
                            </p>
                        </div>
                    )}
                </div>

                {/* Right side header actions */}
                {!selectedBusiness && (
                    <button
                        onClick={() => {
                            setBusinessNameInput('');
                            setIsCreateBizModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                        <FiPlus size={18} />
                        <span>Create Business</span>
                    </button>
                )}
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative">
                <div className="max-w-6xl mx-auto">

                    {/* VIEW 1: BUSINESSES LIST */}
                    {!selectedBusiness && (
                        <div>
                            {/* Search and Business Count Bar */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg font-bold text-gray-900">Personal Businesses</h2>
                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                        {businesses.length}
                                    </span>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Search businesses..."
                                        value={bizSearchQuery}
                                        onChange={(e) => setBizSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Loading state */}
                            {isLoadingBusinesses ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="p-6 bg-white border border-gray-200 rounded-2xl animate-pulse space-y-4">
                                            <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                                            <div className="h-4 bg-gray-200 rounded-sm w-3/4"></div>
                                            <div className="h-3 bg-gray-100 rounded-sm w-1/2"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : businesses.length === 0 ? (
                                /* Empty state: No businesses */
                                <div className="text-center py-16 px-6 bg-white rounded-2xl border-2 border-dashed border-gray-200 max-w-xl mx-auto shadow-xs">
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <FiBriefcase size={28} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No personal businesses yet</h3>
                                    <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                                        Create a business to begin generating and organizing corresponding personal invoices.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setBusinessNameInput('');
                                            setIsCreateBizModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
                                    >
                                        <FiPlus size={18} />
                                        <span>Create First Business</span>
                                    </button>
                                </div>
                            ) : (
                                /* Grid of Business Cards */
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filteredBusinesses.map((biz) => {
                                        const invoiceCount = biz.invoices ? biz.invoices.length : 0;
                                        return (
                                            <div
                                                key={biz.id}
                                                onClick={() => setSelectedBusiness(biz)}
                                                className="group relative bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                                            <FiBriefcase size={22} />
                                                        </div>

                                                        {/* Context Menu for Edit / Delete */}
                                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => setOpenMenuBizId(openMenuBizId === biz.id ? null : biz.id)}
                                                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="More options"
                                                            >
                                                                <FiMoreVertical size={16} />
                                                            </button>

                                                            {openMenuBizId === biz.id && (
                                                                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95">
                                                                    <button
                                                                        onClick={() => {
                                                                            setBizToRename(biz);
                                                                            setBusinessNameInput(biz.name);
                                                                            setIsRenameBizModalOpen(true);
                                                                            setOpenMenuBizId(null);
                                                                        }}
                                                                        className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-700 font-medium"
                                                                    >
                                                                        <FiEdit2 size={13} />
                                                                        <span>Rename</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            handleDeleteBusiness(biz);
                                                                            setOpenMenuBizId(null);
                                                                        }}
                                                                        className="w-full text-left px-3.5 py-2 hover:bg-red-50 flex items-center gap-2 text-red-600 font-medium border-t border-gray-100"
                                                                    >
                                                                        <FiTrash2 size={13} />
                                                                        <span>Delete</span>
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                                                        {biz.name}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Created {new Date(biz.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>

                                                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                                                        <span>{invoiceCount} {invoiceCount === 1 ? 'Invoice' : 'Invoices'}</span>
                                                        <span className="text-gray-300">•</span>
                                                        <span className="text-indigo-600">{biz.parties?.length || 0} {(biz.parties?.length || 0) === 1 ? 'Party' : 'Parties'}</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                                                        Open &rarr;
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Quick "+ Create New Business" Card */}
                                    <div
                                        onClick={() => {
                                            setBusinessNameInput('');
                                            setIsCreateBizModalOpen(true);
                                        }}
                                        className="border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-white/60 hover:bg-indigo-50/40 rounded-2xl p-5 flex flex-col items-center justify-center min-h-[170px] cursor-pointer transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-indigo-100 text-gray-400 group-hover:text-indigo-600 flex items-center justify-center mb-3 transition-colors">
                                            <FiPlus size={22} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-700 transition-colors">
                                            + New Business
                                        </span>
                                        <span className="text-xs text-gray-400 mt-0.5">Click to add</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* VIEW 2: SELECTED BUSINESS (PARTY DETAILS & RECENT INVOICES) */}
                    {selectedBusiness && (
                        <div className="space-y-6">

                            {/* SECTION 1: RECENT SAVED INVOICES */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-bold text-gray-900">Recent Saved Invoices</h2>
                                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                            {savedInvoices.length}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:w-64">
                                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                            <input
                                                type="text"
                                                placeholder="Search invoices..."
                                                value={invoiceSearchQuery}
                                                onChange={(e) => {
                                                    setInvoiceSearchQuery(e.target.value);
                                                    setCurrentPage(1);
                                                }}
                                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                            />
                                        </div>

                                        <button
                                            onClick={() => setIsAddModalOpen(true)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                                        >
                                            <FiPlus size={15} />
                                            <span>Generate Invoice</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Invoices Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[650px]">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                                <th className="px-6 py-3.5">Invoice No</th>
                                                <th className="px-6 py-3.5">Date</th>
                                                <th className="px-6 py-3.5">Client</th>
                                                <th className="px-6 py-3.5 text-right">Total Amount</th>
                                                <th className="px-6 py-3.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {isLoadingInvoices ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                                        Loading invoices...
                                                    </td>
                                                </tr>
                                            ) : savedInvoices.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                                        <div className="max-w-md mx-auto">
                                                            <p className="font-semibold text-gray-800">No invoices saved yet for {selectedBusiness.name}</p>
                                                            <p className="text-xs text-gray-400 mt-1">Click below to generate your first invoice for this business.</p>
                                                            <button
                                                                onClick={() => setIsAddModalOpen(true)}
                                                                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded-lg transition-colors"
                                                            >
                                                                <FiPlus size={14} />
                                                                <span>Create First Invoice</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredInvoices.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                                        No invoices matched your search "{invoiceSearchQuery}".
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedInvoices.map((inv) => (
                                                    <tr key={inv.id} className="hover:bg-indigo-50/40 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="font-semibold text-indigo-600">{inv.invoiceNo}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600">{inv.date}</td>
                                                        <td className="px-6 py-4 text-gray-900 font-semibold">{inv.clientName}</td>
                                                        <td className="px-6 py-4 text-right font-black text-gray-900">
                                                            ₹{parseFloat(inv.grandTotal || 0).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                                            <button
                                                                onClick={() => setViewingInvoice(inv)}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                                                title="View"
                                                            >
                                                                <FiEye size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleEditInvoice(inv)}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                                                title="Edit"
                                                            >
                                                                <FiEdit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteInvoice(inv.id)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                                                                title="Delete"
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
                                {totalInvoicePages > 0 && filteredInvoices?.length > 0 && (
                                    <div className="flex items-center justify-between mt-4 px-2">
                                        <span className="text-sm text-gray-500">
                                            Page {currentPage} of {totalInvoicePages}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setCurrentPage(p => Math.min(totalInvoicePages, p + 1))}
                                                disabled={currentPage === totalInvoicePages}
                                                className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 2: PARTY DETAILS */}
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-lg font-bold text-gray-900">Party Details</h2>
                                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                            {parties.length}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        {/* Search */}
                                        <div className="relative flex-1 sm:w-64">
                                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                                            <input
                                                type="text"
                                                placeholder="Search parties..."
                                                value={partySearchQuery}
                                                onChange={(e) => {
                                                    setPartySearchQuery(e.target.value);
                                                    setPartyPage(1);
                                                }}
                                                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                            />
                                        </div>

                                        <button
                                            onClick={() => {
                                                setPartyToEdit(null);
                                                setIsPartyModalOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
                                        >
                                            <FiPlus size={15} />
                                            <span>Add New Party</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Parties Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[700px]">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                                                <th className="px-6 py-3.5">Party Name</th>
                                                <th className="px-6 py-3.5">Custom Details</th>
                                                <th className="px-6 py-3.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 text-sm">
                                            {isLoadingParties ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                                        Loading parties...
                                                    </td>
                                                </tr>
                                            ) : parties.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-10 text-center text-gray-500">
                                                        <div className="max-w-md mx-auto">
                                                            <p className="font-semibold text-gray-800">No parties added yet</p>
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                Create parties with custom details (e.g. Address, Phone, GSTIN) once to auto-fill details on invoices!
                                                            </p>
                                                            <button
                                                                onClick={() => {
                                                                    setPartyToEdit(null);
                                                                    setIsPartyModalOpen(true);
                                                                }}
                                                                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded-lg transition-colors"
                                                            >
                                                                <FiPlus size={14} />
                                                                <span>Add First Party</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : filteredParties.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                                        No parties matched your search "{partySearchQuery}".
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedParties.map((p) => (
                                                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                                                        <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <span>{p.name}</span>
                                                                {(p.isIndividual || p.type === 'individual') && (
                                                                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                                                                        Individual
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {Array.isArray(p.customFields) && p.customFields.length > 0 ? (
                                                                <div className="flex flex-wrap items-center gap-1.5">
                                                                    {p.customFields.map((f, i) => (
                                                                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                                                                            <span className="text-gray-400 font-semibold">{f.key}:</span>
                                                                            <span className="font-medium text-gray-800">{f.value || '—'}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs italic">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                                                            <button
                                                                onClick={() => setViewingParty(p)}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                                                title="View Details"
                                                            >
                                                                <FiEye size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setPartyToEdit(p);
                                                                    setIsPartyModalOpen(true);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                                                                title="Edit Party"
                                                            >
                                                                <FiEdit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteParty(p)}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                                                                title="Delete Party"
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

                                {totalPartyPages > 0 && filteredParties?.length > 0 && (
                                    <div className="flex items-center justify-between mt-4 px-2">
                                        <span className="text-sm text-gray-500">
                                            Page {partyPage} of {totalPartyPages}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setPartyPage(p => Math.max(1, p - 1))}
                                                disabled={partyPage === 1}
                                                className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                onClick={() => setPartyPage(p => Math.min(totalPartyPages, p + 1))}
                                                disabled={partyPage === totalPartyPages}
                                                className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    )}

                </div>
            </main>

            {/* MODAL 1: CREATE BUSINESS MODAL */}
            {isCreateBizModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    <FiBriefcase size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Create Personal Business</h3>
                                    <p className="text-xs text-gray-500">Only business name is required</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreateBizModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateBusiness} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Business Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={businessNameInput}
                                    onChange={(e) => setBusinessNameInput(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateBizModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!businessNameInput.trim() || isSavingBiz}
                                    className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all active:scale-95"
                                >
                                    {isSavingBiz ? 'Creating...' : 'Create Business'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: RENAME BUSINESS MODAL */}
            {isRenameBizModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
                            <h3 className="text-base font-bold text-gray-900">Rename Business</h3>
                            <button
                                onClick={() => {
                                    setIsRenameBizModalOpen(false);
                                    setBizToRename(null);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleRenameBusiness} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Business Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={businessNameInput}
                                    onChange={(e) => setBusinessNameInput(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsRenameBizModalOpen(false);
                                        setBizToRename(null);
                                    }}
                                    className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!businessNameInput.trim() || isSavingBiz}
                                    className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-all active:scale-95"
                                >
                                    {isSavingBiz ? 'Saving...' : 'Save Name'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Template & Invoice Generating Modals */}
            <AddPersonalTemplateModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleConfigureInvoice}
                parties={parties}
                onOpenCreateParty={() => {
                    setPartyToEdit(null);
                    setIsPartyModalOpen(true);
                }}
            />

            <GeneratePersonalInvoiceModal
                key={editingInvoice ? `edit-${editingInvoice.id}` : (isGenerateModalOpen ? 'new-invoice' : 'closed')}
                isOpen={isGenerateModalOpen}
                onClose={() => {
                    setIsGenerateModalOpen(false);
                    setSelectedTemplateToGenerate(null);
                    setEditingInvoice(null);
                }}
                template={editingInvoice ? (typeof editingInvoice.template === 'string' ? JSON.parse(editingInvoice.template) : editingInvoice.template) : selectedTemplateToGenerate}
                savedInvoice={editingInvoice}
                allInvoices={savedInvoices}
                parties={parties}
                mode={null}
                onSaveInvoice={async (invoice) => {
                    const invoicePayload = {
                        ...invoice,
                        businessId: selectedBusiness?.id
                    };
                    try {
                        if (editingInvoice) {
                            const res = await freelanceApi.updateInvoice(editingInvoice.id, invoicePayload);
                            const updatedInv = res.data?.data || invoicePayload;
                            setSavedInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? updatedInv : inv));
                        } else {
                            const res = await freelanceApi.createInvoice(invoicePayload);
                            const savedInv = res.data?.data || invoicePayload;
                            setSavedInvoices(prev => [savedInv, ...prev]);
                            // Update invoice count for the business card
                            setBusinesses(prev => prev.map(b => {
                                if (b.id === selectedBusiness?.id) {
                                    return { ...b, invoices: [...(b.invoices || []), savedInv] };
                                }
                                return b;
                            }));
                        }
                    } catch (err) {
                        console.error("Failed to save invoice to backend", err);
                        if (editingInvoice) {
                            setSavedInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? invoicePayload : inv));
                        } else {
                            setSavedInvoices(prev => [invoicePayload, ...prev]);
                        }
                    }
                    setIsGenerateModalOpen(false);
                    setEditingInvoice(null);
                }}
            />

            <GeneratePersonalInvoiceModal
                key={viewingInvoice ? `view-${viewingInvoice.id}` : 'no-view'}
                isOpen={!!viewingInvoice}
                onClose={() => setViewingInvoice(null)}
                template={viewingInvoice ? (typeof viewingInvoice.template === 'string' ? JSON.parse(viewingInvoice.template) : viewingInvoice.template) : null}
                savedInvoice={viewingInvoice}
                allInvoices={savedInvoices}
                parties={parties}
                mode="view"
                onEdit={(inv) => {
                    setViewingInvoice(null);
                    handleEditInvoice(inv);
                }}
            />

            {/* Party Create / Edit Modal */}
            <ViewPersonalPartyModal
                isOpen={!!viewingParty}
                onClose={() => setViewingParty(null)}
                party={viewingParty}
                onEdit={(p) => {
                    setPartyToEdit(p);
                    setIsPartyModalOpen(true);
                }}
            />

            <PersonalPartyModal
                isOpen={isPartyModalOpen}
                onClose={() => {
                    setIsPartyModalOpen(false);
                    setPartyToEdit(null);
                }}
                onSave={handleSaveParty}
                party={partyToEdit}
                businessName={selectedBusiness?.name}
            />
        </div>
    );
}
