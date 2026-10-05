import React, { useState, useEffect, useMemo } from 'react';
import { FiMenu, FiFileText, FiBriefcase, FiMoreVertical, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import AddBusinessModal from '../Components/AddBusinessModal';
import apiClient, { businessApi } from '../api/apiClient';

export default function InvoiceGenerator({ setMobileOpen, setActivePath, setCurrentBusiness }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [businesses, setBusinesses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deleteModalBiz, setDeleteModalBiz] = useState(null);
    const [deleteStats, setDeleteStats] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const extractCount = (res, key) => {
        if (!res || !res.data) return 0;
        if (res.data.pagination && res.data.pagination.totalItems !== undefined) return res.data.pagination.totalItems;
        if (Array.isArray(res.data[key])) return res.data[key].length;
        if (res.data.data) {
            if (Array.isArray(res.data.data)) return res.data.data.length;
            if (Array.isArray(res.data.data[key])) return res.data.data[key].length;
        }
        return 0;
    };

    const handleDeleteClick = async (e, biz) => {
        e.stopPropagation();
        setOpenMenuId(null);
        setDeleteModalBiz(biz);
        setDeleteStats(null);
        try {
            const [tpls, invs, pts] = await Promise.all([
                businessApi.getTemplates(biz.id).catch(() => ({ data: { data: [] } })),
                businessApi.getSavedInvoices(biz.id).catch(() => ({ data: { data: [] } })),
                businessApi.listParties(biz.id).catch(() => ({ data: { data: [] } }))
            ]);
            setDeleteStats({
                templates: extractCount(tpls, 'templates'),
                invoices: extractCount(invs, 'invoices'),
                parties: extractCount(pts, 'parties')
            });
        } catch (err) {
            console.error('Failed to fetch delete stats', err);
            setDeleteStats({ templates: 0, invoices: 0, parties: 0, error: true });
        }
    };

    const confirmDelete = async () => {
        if (!deleteModalBiz) return;
        setIsDeleting(true);
        try {
            await apiClient.delete('/business/' + deleteModalBiz.id);
            await fetchBusinesses();
            setDeleteModalBiz(null);
        } catch (err) {
            console.error('Failed to delete business', err);
            alert('Failed to delete business');
        } finally {
            setIsDeleting(false);
        }
    };
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser?.role === 'superadmin';

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get('/business');
            if (response.data.success) {
                const uniqueBusinesses = Array.from(
                    new Map((response.data.data || []).map(b => [b.id, b])).values()
                );
                setBusinesses(uniqueBusinesses);
            }
        } catch (error) {
            console.error('Failed to fetch businesses:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveBusiness = async (businessData) => {
        if (!isSuperAdmin || isSaving) return;
        setIsSaving(true);
        try {
            let base64Logo = null;
            if (businessData.logo) {
                base64Logo = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(businessData.logo);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });
            }

            const payload = {
                name: businessData.name,
                logo: base64Logo,
                additionalData: businessData.additionalData || [],
                sharedUsers: businessData.sharedUsers || [],
                seals: businessData.seals || [],
                signatures: businessData.signatures || [],
                signatureImage: businessData.signatureImage || (businessData.signatures?.[0] || null)
            };
            const response = await apiClient.post('/business', payload);
            if (response.data.success) {
                setIsModalOpen(false);
                await fetchBusinesses();
            }
        } catch (error) {
            console.error('Failed to save business:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBusinessClick = (biz) => {
        if (setCurrentBusiness) setCurrentBusiness(biz);
        setActivePath('/business-details');
    };

    // Ensure businesses are always strictly unique by ID
    const uniqueBusinesses = useMemo(() => {
        return Array.from(new Map((businesses || []).map(b => [b.id, b])).values());
    }, [businesses]);

    return (
        <div className="flex-1 flex flex-col h-screen bg-white overflow-hidden relative">
            {/* Header */}
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
                        Invoice Generator
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 sm:p-10 relative bg-white">
                <div className="max-w-6xl mx-auto">
                    
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-md font-bold text-gray-900">Businesses</h2>
                        <span className="text-[13px] font-medium text-gray-400">{uniqueBusinesses.length} Businesses</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                        {/* Loading State */}
                        {isLoading && (
                            Array.from({ length: 4 }).map((_, idx) => (
                                <div key={idx} className="flex flex-col p-4 bg-gray-50 border border-gray-100 rounded-xl animate-pulse min-h-[82px] shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
                                    <div className="flex items-center gap-4 relative">
                                        <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Map over saved businesses */}
                        {!isLoading && uniqueBusinesses.map((biz) => (
                            <div 
                                key={biz.id} 
                                onClick={() => handleBusinessClick(biz)}
                                className="flex flex-col p-4 bg-gray-100 border border-gray-200 rounded-xl hover:shadow-sm cursor-pointer transition-all shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] h-full"
                            >
                                <div className="flex items-center gap-4 relative">
                                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center overflow-hidden ${biz.logo ? "bg-white border border-gray-100 p-1" : "bg-blue-100 text-blue-600"}`}>
                                        {biz.logo ? (
                                            <img src={biz.logo} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <FiBriefcase className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-center w-full">
                                            <h4 className="text-sm font-bold text-gray-800 truncate pr-2">
                                                {biz.name}
                                            </h4>
                                            {isSuperAdmin && (
                                            <div className="shrink-0 relative">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === biz.id ? null : biz.id); }}
                                                    className="p-1 rounded hover:bg-gray-200 text-gray-600 transition-colors"
                                                >
                                                    <FiMoreVertical size={16} />
                                                </button>
                                                {openMenuId === biz.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-xl border border-gray-100 z-[100] py-1">
                                                        <button 
                                                            onClick={(e) => handleDeleteClick(e, biz)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                        >
                                                            <FiTrash2 size={14} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-medium text-gray-400 truncate mt-1">
                                            {biz.isProductBased ? 'Product-based' : 'Service-based'}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Custom Columns */}
                                {(() => {
                                    let cols = [];
                                    try {
                                        cols = Array.isArray(biz.columns) ? biz.columns : JSON.parse(biz.columns || '[]');
                                    } catch (e) {
                                        cols = [];
                                    }
                                    if (cols.length > 0) {
                                        return (
                                            <div className="flex flex-wrap gap-1 mt-4 pt-3 border-t border-gray-200">
                                                {cols.slice(0, 3).map((col, cIdx) => (
                                                    <span key={cIdx} className="px-2 py-0.5 bg-white text-gray-600 text-[10px] font-medium rounded border border-gray-200 truncate max-w-[80px]">
                                                        {col}
                                                    </span>
                                                ))}
                                                {cols.length > 3 && (
                                                    <span className="px-2 py-0.5 bg-white text-gray-500 text-[10px] font-medium rounded border border-gray-200">
                                                        +{cols.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        ))}

                        {/* Add New Business Card (Superadmin only) */}
                        {!isLoading && isSuperAdmin && (
                            <div 
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-4 p-4 bg-gray-100 border border-gray-200 rounded-xl cursor-pointer transition-all group shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]"
                            >
                                <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-gray-50 border border-dashed border-gray-300 text-gray-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                                    <span className="text-xl">+</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-blue-600 transition-colors">
                                        Add New Business
                                    </h4>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {deleteModalBiz && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                                    <FiAlertCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Delete Business</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteModalBiz.name}"</span>?
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Data to be deleted</h4>
                                {deleteStats ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Saved Templates</span>
                                            <span className="font-bold text-gray-900">{deleteStats.templates}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Saved Invoices</span>
                                            <span className="font-bold text-gray-900">{deleteStats.invoices}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Saved Parties</span>
                                            <span className="font-bold text-gray-900">{deleteStats.parties}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-center items-center py-4 text-gray-400 text-sm">
                                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Calculating data...
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-red-500 text-center mt-2 px-4">
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setDeleteModalBiz(null)}
                                className="px-5 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                disabled={isDeleting || !deleteStats}
                                className="px-5 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Add Business Modal */}
            <AddBusinessModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveBusiness}
                isSaving={isSaving}
            />
        </div>
    );
}
