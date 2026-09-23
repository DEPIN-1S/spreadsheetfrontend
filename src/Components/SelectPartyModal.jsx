import React, { useState, useEffect } from 'react';
import { FiX, FiSearch, FiUser } from 'react-icons/fi';
import { businessApi } from '../api/apiClient';

export default function SelectPartyModal({ isOpen, onClose, onSelect, businessId }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [parties, setParties] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && businessId) {
            const fetchParties = async () => {
                setIsLoading(true);
                try {
                    const res = await businessApi.listParties(businessId, 1, 50, searchQuery);
                    if (res.data.success) {
                        setParties(res.data.data.parties);
                    }
                } catch (error) {
                    console.error("Failed to fetch parties:", error);
                }
                setIsLoading(false);
            };

            const debounceTimer = setTimeout(() => {
                fetchParties();
            }, 300);

            return () => clearTimeout(debounceTimer);
        }
    }, [isOpen, businessId, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Select Party</h2>
                        <p className="text-xs text-gray-500">Choose a party to generate the invoice</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
                        <FiX size={20} />
                    </button>
                </div>
                
                <div className="p-4">
                    <div className="relative mb-4">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50"
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {isLoading ? (
                            <p className="text-center text-sm text-gray-500 py-4">Loading...</p>
                        ) : parties.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 py-4">No parties found.</p>
                        ) : (
                            parties.map(party => (
                                <button
                                    key={party.id}
                                    onClick={() => {
                                        onSelect(party);
                                    }}
                                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-left group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-200 shrink-0">
                                            <FiUser size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-gray-900 text-sm truncate">{party.name}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">{party.contact || party.email || 'No contact info'}</p>
                                        </div>
                                    </div>

                                    {(party.age || party.gender) && (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                                            {party.age && <span>{party.age}</span>}
                                            {party.age && party.gender && <span className="mx-1 text-indigo-300">/</span>}
                                            {party.gender && <span>{party.gender}</span>}
                                        </span>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
