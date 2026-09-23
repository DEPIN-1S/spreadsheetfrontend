import React from 'react';
import { FiX, FiUsers } from 'react-icons/fi';

export default function ViewBusinessPartyModal({ isOpen, onClose, party }) {
    if (!isOpen || !party) return null;

    let extraData = [];
    try {
        if (party.additionalData) {
            extraData = typeof party.additionalData === 'string' ? JSON.parse(party.additionalData) : party.additionalData;
        }
    } catch(e) {}

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FiUsers size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Party Details</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    <div className="grid grid-cols-2 gap-4">
                        <div className={(party.age || party.gender) ? "col-span-1" : "col-span-1"}>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Party Name</label>
                            <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">{party.name}</p>
                        </div>
                        
                        <div className={(party.age || party.gender) ? "col-span-1" : "col-span-1"}>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Number</label>
                            <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">{party.contact}</p>
                        </div>

                        {party.age && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Age</label>
                                <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">{party.age}</p>
                            </div>
                        )}

                        {party.gender && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Gender</label>
                                <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">{party.gender}</p>
                            </div>
                        )}
                    </div>

                    {Array.isArray(extraData) && extraData.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">Additional Information</h3>
                            <div className="space-y-2">
                                {extraData.map((data, idx) => {
                                    const isObj = typeof data === 'object' && data !== null;
                                    let key = isObj ? data.key : '';
                                    let value = isObj ? data.value : String(data);
                                    
                                    if (!isObj && typeof data === 'string' && data.includes(':')) {
                                        const parts = data.split(':');
                                        key = parts[0].trim();
                                        value = parts.slice(1).join(':').trim();
                                    }

                                    return (
                                        <div key={idx} className="flex items-start gap-3 text-sm bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                                            {key ? (
                                                <>
                                                    <span className="font-semibold text-gray-600 min-w-[100px] shrink-0 text-xs uppercase tracking-wider pt-0.5">{key}:</span>
                                                    <span className="text-gray-900 font-medium break-all flex-1">{value}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-900 font-medium break-all flex-1">{value}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
