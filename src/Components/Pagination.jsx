import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function Pagination({
    currentPage = 1,
    totalItems = 0,
    itemsPerPage = 10,
    onPageChange,
    onItemsPerPageChange,
    pageSizeOptions = [10, 25, 50, 100]
}) {
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(totalItems, currentPage * itemsPerPage);

    // Generate page numbers array with ellipses if many pages
    const getPageNumbers = () => {
        const pages = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 4) {
                pages.push(1, 2, 3, 4, 5, '...', totalPages);
            } else if (currentPage >= totalPages - 3) {
                pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            {/* Info and Page Size Selector */}
            <div className="flex items-center gap-3 text-gray-600 font-medium">
                <span>
                    Showing <strong className="font-semibold text-gray-900">{startItem}</strong> to <strong className="font-semibold text-gray-900">{endItem}</strong> of <strong className="font-semibold text-gray-900">{totalItems}</strong> entries
                </span>

                {onItemsPerPageChange && (
                    <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-500">Rows per page:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                onItemsPerPageChange(Number(e.target.value));
                                onPageChange(1);
                            }}
                            className="bg-white border border-gray-200 rounded px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                        >
                            {pageSizeOptions.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-1">
                {/* Previous Button */}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        currentPage === 1
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm'
                    }`}
                >
                    <FiChevronLeft size={14} />
                    <span>Prev</span>
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1 mx-1">
                    {getPageNumbers().map((page, idx) => {
                        if (page === '...') {
                            return (
                                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 font-bold">
                                    ...
                                </span>
                            );
                        }
                        const isCurrent = page === currentPage;
                        return (
                            <button
                                key={page}
                                type="button"
                                onClick={() => onPageChange(page)}
                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                                    isCurrent
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/20'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Next Button */}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm'
                    }`}
                >
                    <span>Next</span>
                    <FiChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}
