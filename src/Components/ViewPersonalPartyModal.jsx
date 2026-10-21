import React from 'react';
import { FiX, FiUser, FiEdit2 } from 'react-icons/fi';

export default function ViewPersonalPartyModal({ isOpen, onClose, party, onEdit }) {
    if (!isOpen || !party) return null;

    const customFields = Array.isArray(party.customFields) ? party.customFields : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-gray-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <FiUser size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Party Details</h2>
                            <p className="text-xs text-gray-500">View complete information for this party</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        title="Close"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Party Name
                            </label>
                            {(party.isIndividual || party.type === 'individual') ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    Individual
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                    Organization / Business
                                </span>
                            )}
                        </div>
                        <p className="text-base font-bold text-gray-900 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-200">
                            {party.name}
                        </p>
                    </div>

                    {customFields.length > 0 ? (
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                                Custom Details ({customFields.length})
                            </h3>
                            <div className="space-y-2">
                                {customFields.map((field, idx) => (
                                    <div key={idx} className="flex items-start gap-3 bg-gray-50/80 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm">
                                        <span className="font-semibold text-gray-500 min-w-[110px] shrink-0 text-xs uppercase tracking-wider pt-0.5">
                                            {field.key || 'Detail'}:
                                        </span>
                                        <span className="text-gray-900 font-medium break-all flex-1 text-xs">
                                            {field.value || '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400">
                            No custom details added for this party.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex justify-between items-center">
                    {onEdit && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onEdit(party);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors"
                        >
                            <FiEdit2 size={13} />
                            <span>Edit Party</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-auto px-5 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors shadow-2xs"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
