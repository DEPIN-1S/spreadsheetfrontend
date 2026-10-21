import React from 'react';
import { FiX, FiUsers, FiFileText } from 'react-icons/fi';

export default function ViewBusinessPartyModal({ isOpen, onClose, party, onViewInvoices }) {
    if (!isOpen || !party) return null;

    let extraData = [];
    try {
        if (party.additionalData) {
            extraData = typeof party.additionalData === 'string' ? JSON.parse(party.additionalData) : party.additionalData;
        }
    } catch(e) {}

    const isCd = Boolean(
        party.isCardioDiabetic || 
        party.cardioDiabetic || 
        (Array.isArray(extraData) && extraData.some(d => (d?.key || '').toLowerCase().includes('cardio') && String(d?.value).toLowerCase() === 'true'))
    );

    const displayExtraData = Array.isArray(extraData) 
        ? extraData.filter(d => !((d?.key || '').toLowerCase().includes('cardio')))
        : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <FiUsers size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-xl font-bold text-gray-900">Party Details</h2>
                                {isCd && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-red-600 text-white shadow-xs tracking-wider">
                                        CD
                                    </span>
                                )}
                            </div>
                            {isCd && (
                                <p className="text-xs text-red-600 font-semibold mt-0.5">Cardio Diabetic Patient / Party</p>
                            )}
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
                            <div className="flex items-center justify-between bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">
                                <span className="text-sm font-medium text-gray-900">{party.name}</span>
                                {isCd && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-600 text-white shadow-xs tracking-wider">
                                        CD
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className={(party.age || party.gender) ? "col-span-1" : "col-span-1"}>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Number</label>
                            <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">{party.contact}</p>
                        </div>

                                                <div className="col-span-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Place</label>
                                <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">{party.place || "-"}</p>
                            </div>

                        <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Age</label>
                                <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">{party.age || "-"}</p>
                            </div>

                        <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Gender</label>
                                <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100">{party.gender || "-"}</p>
                            </div>
                    </div>

                    {Array.isArray(displayExtraData) && displayExtraData.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2">Additional Information</h3>
                            <div className="space-y-2">
                                {displayExtraData.map((data, idx) => {
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

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    {onViewInvoices ? (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onViewInvoices(party);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                            <FiFileText size={15} />
                            <span>View Party Invoices</span>
                        </button>
                    ) : <div />}
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
