import React, { useState, useEffect } from 'react';
import { FiMenu, FiFileText, FiBriefcase } from 'react-icons/fi';
import AddBusinessModal from '../Components/AddBusinessModal';
import apiClient from '../api/apiClient';

export default function InvoiceGenerator({ setMobileOpen, setActivePath, setCurrentBusiness }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [businesses, setBusinesses] = useState([]);

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const fetchBusinesses = async () => {
        try {
            const response = await apiClient.get('/business');
            if (response.data.success) {
                setBusinesses(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch businesses:', error);
        }
    };

    const handleSaveBusiness = async (businessData) => {
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
                seals: businessData.seals || []
            };
            const response = await apiClient.post('/business', payload);
            if (response.data.success) {
                setBusinesses([response.data.data, ...businesses]);
                setIsModalOpen(false);
            }
        } catch (error) {
            console.error('Failed to save business:', error);
        }
    };

    const handleBusinessClick = (biz) => {
        if (setCurrentBusiness) setCurrentBusiness(biz);
        setActivePath('/business-details');
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-white overflow-hidden relative">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4">
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
                        <span className="text-[13px] font-medium text-gray-400">{businesses.length} Businesses</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                        {/* Map over saved businesses */}
                        {businesses.map((biz, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => handleBusinessClick(biz)}
                                className="flex flex-col p-4 bg-gray-100 border border-gray-200 rounded-xl hover:shadow-sm cursor-pointer transition-all shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] h-full"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 overflow-hidden">
                                        {biz.logo ? (
                                            <img src={biz.logo} alt="Logo" className="w-full h-full object-cover" />
                                        ) : (
                                            <FiBriefcase className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-bold text-gray-800 truncate">
                                            {biz.name}
                                        </h4>
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

                        {/* Add New Business Card */}
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
                    </div>
                </div>
            </main>

            {/* Add Business Modal */}
            <AddBusinessModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveBusiness}
            />
        </div>
    );
}
