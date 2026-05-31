import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getSocket } from "../api/socket";
import {
    FiCornerUpLeft, FiCornerUpRight, FiBold, FiItalic, FiUnderline,
    FiType, FiAlignLeft, FiAlignCenter, FiAlignRight, FiSearch,
    FiChevronDown, FiPlus, FiShare2, FiDownload, FiUser, FiArrowLeft, FiImage, FiX,
    FiChevronLeft, FiChevronRight,
    FiEdit2, FiFilter, FiTrash2, FiScissors, FiCopy, FiClipboard, FiColumns, FiAlignJustify, FiArrowUp, FiArrowDown, FiArrowRight, FiList, FiDelete, FiUploadCloud,
    FiMessageSquare, FiSend, FiCalendar, FiFileText, FiFile, FiExternalLink, FiAlertCircle, FiClock
} from "react-icons/fi";

import { BsPaintBucket, BsSortAlphaDown, BsSortAlphaDownAlt, BsFilter, BsWhatsapp } from "react-icons/bs";
import { BiStrikethrough, BiArrowToLeft, BiArrowToRight } from "react-icons/bi";
import { TbMathFunction } from "react-icons/tb";
import apiClient from "../api/apiClient";
import { getMediaUrl } from "../utils/media";
import { formatCurrency, parseCurrencyInput, SUPPORTED_CURRENCIES, getCurrencySymbol } from "../utils/currencyUtils";
import ShareModal from "../Components/ShareModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useClipboard } from "../context/ClipboardContext";
import EmojiPicker from "emoji-picker-react";

export default function DocumentEditor({ docName, setActivePath, returnPath, isNested = false }) {
    const [sheetData, setSheetData] = useState(null);
    const [accessError, setAccessError] = useState(false);
    const [rows, setRows] = useState([]);
    const [columns, setColumns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportSelectedColumns, setExportSelectedColumns] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

    const [newColumnBgColor, setNewColumnBgColor] = useState(null);
    const [newColumnIsBold, setNewColumnIsBold] = useState(false);
    const [newColumnIsItalic, setNewColumnIsItalic] = useState(false);
    const [newColumnIsDetailedView, setNewColumnIsDetailedView] = useState(false);
    const [newColumnWidth, setNewColumnWidth] = useState(220);
    const [newColumnIsUnderline, setNewColumnIsUnderline] = useState(false);
    const [newColumnIsStrikethrough, setNewColumnIsStrikethrough] = useState(false);
    const [newColumnFontFamily, setNewColumnFontFamily] = useState('sans');
    const [newColumnAlignment, setNewColumnAlignment] = useState('left');
    const [showUpdateConfirmModal, setShowUpdateConfirmModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [columnToDelete, setColumnToDelete] = useState(null);
    const [showPDFDeleteConfirmModal, setShowPDFDeleteConfirmModal] = useState(false);
    const [pdfToDeleteIndex, setPdfToDeleteIndex] = useState(null);
    const [showImageDeleteConfirmModal, setShowImageDeleteConfirmModal] = useState(false);
    const [imageToDeleteIndex, setImageToDeleteIndex] = useState(null);
    const [showCommentDeleteConfirmModal, setShowCommentDeleteConfirmModal] = useState(false);
    const [commentToDeleteId, setCommentToDeleteId] = useState(null);
    const [showEnableRowModal, setShowEnableRowModal] = useState(false);
    const [rowToEnable, setRowToEnable] = useState(null);
    const [nestedSheetsMapping, setNestedSheetsMapping] = useState({});
    const [activeNestedSheetId, setActiveNestedSheetId] = useState(null);
    const { cellClipboard, setCellClipboard } = useClipboard();
    const [emojiPickerCell, setEmojiPickerCell] = useState(null); // { rowId, colId }
    const emojiTextareaRefs = useRef({});

    // Helper to safely parse column options
    const parseOptions = (options) => {
        if (!options) return {};
        if (typeof options === 'object') return options;
        try {
            const parsed = JSON.parse(options);
            return typeof parsed === 'object' ? (parsed || {}) : {};
        } catch {
            return {};
        }
    };

    // Column resize state
    const [resizingCol, setResizingCol] = useState(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(0);

    const handleColResizeStart = (e, col) => {
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;

        // Prevent scrolling on touch
        if (isTouch) {
            // e.preventDefault(); // Might interfere with some browsers if not passive: false elsewhere
        } else {
            e.preventDefault();
        }
        e.stopPropagation();

        setResizingCol(col.id);
        resizeStartX.current = clientX;
        resizeStartWidth.current = col.width || 220;

        const onMove = (moveEvent) => {
            if (moveEvent.type === 'touchmove') {
                moveEvent.preventDefault();
            }
            const currentX = moveEvent.type === 'touchmove' ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const delta = currentX - resizeStartX.current;
            const newWidth = Math.max(80, resizeStartWidth.current + delta);
            setColumns(prev => prev.map(c => c.id === col.id ? { ...c, width: newWidth } : c));
        };

        const onEnd = async (endEvent) => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);

            setResizingCol(null);

            const currentX = endEvent.type === 'touchend' ? endEvent.changedTouches[0].clientX : endEvent.clientX;
            const finalWidth = Math.max(80, resizeStartWidth.current + (currentX - resizeStartX.current));

            // Persist width to backend
            try {
                await apiClient.put(`/sheets/${docName}/columns/${col.id}`, { width: finalWidth });
            } catch (err) {
                console.error('Error saving column width:', err);
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    };

    const COLOR_PALETTE = [
        { name: 'None', value: null },

        // Reds & Pinks
        { name: 'Red', value: '#fee2e2' },
        { name: 'Rose', value: '#ffe4e6' },
        { name: 'Pink', value: '#fce7f3' },

        // Oranges & Yellows
        { name: 'Orange', value: '#ffedd5' },
        { name: 'Amber', value: '#fef3c7' },
        { name: 'Yellow', value: '#fef9c3' },

        // Greens
        { name: 'Lime', value: '#ecfccb' },
        { name: 'Green', value: '#dcfce7' },
        { name: 'Emerald', value: '#d1fae5' },

        // Teals & Cyans
        { name: 'Teal', value: '#ccfbf1' },
        { name: 'Cyan', value: '#cffafe' },

        // Blues
        { name: 'Sky Blue', value: '#e0f2fe' },
        { name: 'Blue', value: '#dbeafe' },
        { name: 'Indigo', value: '#e0e7ff' },

        // Purples
        { name: 'Purple', value: '#f3e8ff' },
        { name: 'Violet', value: '#e9d5ff' },

        // Neutrals
        { name: 'Gray', value: '#f3f4f6' },
        { name: 'Slate', value: '#e2e8f0' },
        { name: 'Cool Gray', value: '#e5e7eb' },
    ];


    useEffect(() => {
        const timer = setTimeout(() => {
            setAppliedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch sheet data from API
    const fetchSheetData = useCallback(async () => {
        if (!docName) return; // docName here is actually the sheetId from MyFiles

        setIsLoading(true);
        setAccessError(false);
        try {
            const url = appliedSearchQuery ? `/sheets/${docName}/data?search=${encodeURIComponent(appliedSearchQuery)}` : `/sheets/${docName}/data`;
            const response = await apiClient.get(url);
            const data = response.data.data;

            setSheetData(data.sheet);

            // Map columns to include width (defaulting to 220 if not provided by backend)
            const mappedCols = data.columns.map(col => ({
                ...col,
                width: col.width || 220
            }));
            setColumns(mappedCols);

            setRows(data.grid);

            // Always restore sort from backend settings (source of truth)
            // This ensures sort persists across navigation and is shared with all viewers
            let settings = data.sheet?.settings || {};
            if (typeof settings === 'string') {
                try { settings = JSON.parse(settings); } catch { settings = {}; }
            }
            const savedSort = settings.sortConfig;
            setSortConfig(
                savedSort && savedSort.colId
                    ? savedSort
                    : { colId: null, direction: 'asc' }
            );

            // Populate mapping for nested sheets
            const mapping = {};
            data.grid.forEach(row => {
                (row.cells || []).forEach(cell => {
                    if (cell.nestedSheetId) mapping[`${row.id}_${cell.columnId}`] = cell.nestedSheetId;
                });
            });
            setNestedSheetsMapping(mapping);
        } catch (error) {
            console.error("Error fetching sheet data:", error);
            if (error.response && error.response.status === 403) {
                setAccessError(true);
            }
        } finally {
            setIsLoading(false);
        }
    }, [docName, appliedSearchQuery]);

    // Silent refresh — updates rows/columns without showing loading spinner
    const refreshFormulaValues = useCallback(async () => {
        if (!docName) return;
        try {
            const url = appliedSearchQuery ? `/sheets/${docName}/data?search=${encodeURIComponent(appliedSearchQuery)}` : `/sheets/${docName}/data`;
            const response = await apiClient.get(url);
            const data = response.data.data;
            setRows(data.grid);
            // Preserve existing column widths while updating column data
            setColumns(prev => data.columns.map(col => {
                const existing = prev.find(c => c.id === col.id);
                return { ...col, width: existing?.width || col.width || 220 };
            }));

            // Populate mapping for nested sheets
            const mapping = {};
            data.grid.forEach(row => {
                (row.cells || []).forEach(cell => {
                    if (cell.nestedSheetId) mapping[`${row.id}_${cell.columnId}`] = cell.nestedSheetId;
                });
            });
            setNestedSheetsMapping(mapping);
        } catch (error) {
            console.error("Error refreshing formula values:", error);
        }
    }, [docName]);

    // Debounced silent refresh to avoid flooding API on every keystroke
    const refreshTimerRef = useRef(null);
    const debouncedRefreshFormulas = useCallback(() => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
            refreshFormulaValues();
        }, 500);
    }, [refreshFormulaValues]);

    useEffect(() => {
        fetchSheetData();
    }, [fetchSheetData]);

    // Real-time updates via Socket.IO
    useEffect(() => {
        if (!docName) return;

        const token = localStorage.getItem('accessToken');
        const socket = getSocket(token);

        const handleConnect = () => {
            console.log("Connected to spreadsheet socket");
            socket.emit("join_sheet", docName);
        };

        socket.on("connect", handleConnect);

        // If already connected when mounting, emit join immediately
        if (socket.connected) {
            handleConnect();
        }

        const handleCellUpdated = (data) => {
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isOwnUpdate = data.updatedBy === currentUser.id;

            setRows(prevRows => prevRows.map(row => {
                if (row.id === data.rowId) {
                    let cellFound = false;
                    const newCells = (row.cells || []).map(cell => {
                        if (cell.columnId === data.columnId) {
                            cellFound = true;
                            if (isOwnUpdate) {
                                return { 
                                    ...cell, 
                                    computedValue: data.computedValue,
                                    formattedValue: data.formattedValue !== undefined ? data.formattedValue : cell.formattedValue
                                };
                            }
                            return { 
                                ...cell, 
                                rawValue: data.rawValue, 
                                computedValue: data.computedValue,
                                formattedValue: data.formattedValue,
                                bgColor: data.bgColor,
                                isBold: data.isBold,
                                isItalic: data.isItalic,
                                isUnderline: data.isUnderline,
                                isStrikethrough: data.isStrikethrough,
                                fontFamily: data.fontFamily,
                                alignment: data.alignment,
                                fileUrl: data.fileUrl,
                                currencyCode: data.currencyCode,
                                nestedSheetId: data.nestedSheetId
                            };
                        }
                        return cell;
                    });

                    if (!cellFound) {
                        newCells.push({
                            columnId: data.columnId,
                            rawValue: data.rawValue,
                            computedValue: data.computedValue,
                            formattedValue: data.formattedValue,
                            bgColor: data.bgColor,
                            isBold: data.isBold,
                            isItalic: data.isItalic,
                            isUnderline: data.isUnderline,
                            isStrikethrough: data.isStrikethrough,
                            fontFamily: data.fontFamily,
                            alignment: data.alignment,
                            fileUrl: data.fileUrl,
                            currencyCode: data.currencyCode,
                            nestedSheetId: data.nestedSheetId
                        });
                    }

                    return { ...row, cells: newCells };
                }
                return row;
            }));
        };

        const handleFormulaRecalculated = (data) => {
            setRows(prevRows => prevRows.map(row => {
                const rowUpdates = data.cells.filter(c => c.rowId === row.id);
                if (rowUpdates.length === 0) return row;

                return {
                    ...row,
                    cells: (row.cells || []).map(cell => {
                        const update = rowUpdates.find(u => u.columnId === cell.columnId);
                        return update ? { ...cell, computedValue: update.computedValue } : cell;
                    })
                };
            }));
        };

        const handleRowUpdated = (data) => {
            if (data.action === "added") {
                setRows(prev => {
                    if (prev.some(r => r.id === data.row.id)) return prev;

                    // Use server cells if provided, otherwise create empty ones
                    const serverCells = data.row.cells || [];
                    let finalCells = serverCells;

                    if (serverCells.length === 0 && prev.length > 0) {
                        const templateRow = prev.find(r => r.cells && r.cells.length > 0) || prev[0];
                        finalCells = (templateRow.cells || []).map(c => ({
                            columnId: c.columnId,
                            rowId: data.row.id,
                            rawValue: '',
                            computedValue: '',
                            formattedValue: ''
                        }));
                    }

                    const updatedRows = [...prev, { ...data.row, cells: finalCells }];
                    return updatedRows.sort((a, b) => (a.order || 0) - (b.order || 0));
                });
            } else if (data.action === "deleted") {
                setRows(prev => prev.filter(r => r.id !== data.rowId));
            } else if (data.action === "color_changed") {
                setRows(prev => prev.map(r => r.id === data.rowId ? { ...r, ...data.row, rowColor: data.rowColor } : r));
            } else if (data.action === "reordered_all") {
                fetchSheetData(); // Full refresh for physical reorder
            }
        };

        const handleColumnUpdated = (data) => {
            if (data.action === "added") {
                setColumns(prev => {
                    if (prev.some(c => c.id === data.column.id)) return prev;
                    return [...prev, data.column].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
                });
                fetchSheetData();
            } else if (data.action === "updated") {
                setColumns(prev => prev.map(col => col.id === data.column.id ? { ...col, ...data.column } : col));
                if (data.column.type === 'formula') {
                    fetchSheetData();
                }
            } else if (data.action === "deleted") {
                setColumns(prev => prev.filter(c => c.id !== data.columnId));
                fetchSheetData();
            } else if (data.action === "reordered") {
                fetchSheetData();
            } else if (data.action === "visibility_changed") {
                setColumns(prev => prev.map(col => col.id === data.columnId ? { ...col, isHidden: data.isHidden } : col));
            } else if (data.action === "sheet_updated") {
                fetchSheetData();
            }
        };

        const handleSortApplied = (data) => {
            if (data.sheetId === docName) {
                setSortConfig(data.sortConfig || { colId: null, direction: 'asc' });
            }
        };

        socket.on("cell_updated", handleCellUpdated);
        socket.on("formula_recalculated", handleFormulaRecalculated);
        socket.on("row_updated", handleRowUpdated);
        socket.on("column_updated", handleColumnUpdated);
        socket.on("sort_applied", handleSortApplied);

        return () => {
            socket.emit("leave_sheet", docName);
            socket.off("connect", handleConnect);
            socket.off("cell_updated", handleCellUpdated);
            socket.off("formula_recalculated", handleFormulaRecalculated);
            socket.off("row_updated", handleRowUpdated);
            socket.off("column_updated", handleColumnUpdated);
            socket.off("sort_applied", handleSortApplied);
        };
    }, [docName]);

    // Context Menu State
    const [activeColumnMenu, setActiveColumnMenu] = useState(null); // { id, x, y }
    const menuRef = useRef(null);

    // Cell Context Menu State
    const [activeCellMenu, setActiveCellMenu] = useState(null);
    const [activeRowMenu, setActiveRowMenu] = useState(null);
    const cellMenuRef = useRef(null);
    const rowMenuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveColumnMenu(null);
            }
            if (cellMenuRef.current && !cellMenuRef.current.contains(event.target)) {
                setActiveCellMenu(null);
            }
            if (rowMenuRef.current && !rowMenuRef.current.contains(event.target)) {
                setActiveRowMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Close sort panel on outside click
    useEffect(() => {
        const handleSortOutside = (e) => {
            if (sortPanelRef.current && !sortPanelRef.current.contains(e.target)) {
                setIsSortPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleSortOutside);
        return () => document.removeEventListener('mousedown', handleSortOutside);
    }, []);

    // Ensure context menus stay within viewport
    useEffect(() => {
        const adjustMenuPosition = (menuRef, menuState, setMenuState) => {
            if (menuState && menuRef.current) {
                const rect = menuRef.current.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                let newX = menuState.x;
                let newY = menuState.y;
                let adjusted = false;

                // Adjust X if it goes off-screen to the right
                if (rect.right > viewportWidth) {
                    newX = viewportWidth - rect.width - 10;
                    adjusted = true;
                }
                // Adjust Y if it goes off-screen at the bottom
                if (rect.bottom > viewportHeight) {
                    newY = viewportHeight - rect.height - 10;
                    adjusted = true;
                }

                // Safety check for top/left
                if (newX < 10) newX = 10;
                if (newY < 10) newY = 10;

                if (adjusted) {
                    setMenuState(prev => prev ? { ...prev, x: newX, y: newY } : null);
                }
            }
        };

        if (activeCellMenu) adjustMenuPosition(cellMenuRef, activeCellMenu, setActiveCellMenu);
        if (activeRowMenu) adjustMenuPosition(rowMenuRef, activeRowMenu, setActiveRowMenu);
    }, [activeCellMenu, activeRowMenu]);


    // Modal State
    const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnType, setNewColumnType] = useState('text');
    const [newColumnCurrencyCode, setNewColumnCurrencyCode] = useState('INR');
    const [newNestedSheetName, setNewNestedSheetName] = useState('');
    const [showRenameSubSheetModal, setShowRenameSubSheetModal] = useState(false);
    const [renamingSubSheetId, setRenamingSubSheetId] = useState(null);
    const [renamingSubSheetName, setRenamingSubSheetName] = useState('');

    // CC Config State
    const [isCCConfigModalOpen, setIsCCConfigModalOpen] = useState(false);
    const [ccTemplateColumns, setCcTemplateColumns] = useState([{ name: '', type: 'text' }]);
    const [configuringCCColId, setConfiguringCCColId] = useState(null);

    // Formula Builder State
    const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
    const [formulaString, setFormulaString] = useState('');
    const [pendingFormulaColumnDesc, setPendingFormulaColumnDesc] = useState(null);
    const [editingColId, setEditingColId] = useState(null);

    // Image Gallery Modal State
    const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
    const [activeImageCell, setActiveImageCell] = useState(null); // { rowId, colId, images: [] }
    const [selectedPreviewImage, setSelectedPreviewImage] = useState(null); // URL for zoomed preview
    const [activePreviewIndex, setActivePreviewIndex] = useState(null);
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    // PDF Gallery Modal State
    const [isPDFGalleryOpen, setIsPDFGalleryOpen] = useState(false);
    const [activePDFCell, setActivePDFCell] = useState(null); // { rowId, colId, documents: [] }
    const [isUploadingPDFs, setIsUploadingPDFs] = useState(false);
    const pdfInputRef = useRef(null);

    const fileInputRef = useRef(null);

    // Calculate Bar State: { [colId]: 'total' | 'average' | null }
    const [columnCalcMode, setColumnCalcMode] = useState({});
    const [activeCalcDropdown, setActiveCalcDropdown] = useState(null);
    const [focusedCell, setFocusedCell] = useState(null);

    // Column Filter State: { [colId]: filterText }
    const [columnFilters, setColumnFilters] = useState({});

    // Column Sort State — persisted in sheet.settings on backend for shared visibility
    const [sortConfig, setSortConfig] = useState({ colId: null, direction: 'asc' });
    const [isSortPanelOpen, setIsSortPanelOpen] = useState(false);
    const [pendingSortConfig, setPendingSortConfig] = useState({ colId: '', direction: 'asc' });
    const sortPanelRef = useRef(null);


    // ── Comment State ─────────────────────────────────────────────────────────
    const [commentCounts, setCommentCounts] = useState({});          // { cellId: count }
    const [commentPanelCell, setCommentPanelCell] = useState(null);  // { cellId, sheetId }
    const [commentsList, setCommentsList] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [newCommentText, setNewCommentText] = useState('');
    const [editingComment, setEditingComment] = useState(null);       // { id, text }
    const [commentSubmitting, setCommentSubmitting] = useState(false);
    const [hoveredCommentCell, setHoveredCommentCell] = useState(null);
    const [latestCommentPreview, setLatestCommentPreview] = useState(null);

    // Fetch comment counts when sheet loads
    const fetchCommentCounts = useCallback(async () => {
        if (!docName) return;
        try {
            const resp = await apiClient.get(`/sheets/${docName}/comment-counts`);
            setCommentCounts(resp.data.data || {});
        } catch (err) {
            console.error('Error fetching comment counts:', err);
        }
    }, [docName]);

    useEffect(() => {
        if (docName) fetchCommentCounts();
    }, [docName, fetchCommentCounts]);

    // Open comment panel for a cell — upserts cell if it doesn't exist yet
    const openCommentPanel = async (cellId, rowId, columnId, permission) => {
        if (!docName) return;

        let resolvedCellId = cellId;

        // If cell doesn't exist yet (empty cell), create it first
        if (!resolvedCellId && rowId && columnId) {
            try {
                const resp = await apiClient.post(`/sheets/${docName}/cells`, {
                    rowId,
                    columnId,
                    rawValue: ''
                });
                resolvedCellId = resp.data.data?.id;
                // Refresh rows to pick up the new cell id
                await refreshFormulaValues();
            } catch (err) {
                console.error('Error creating cell for comments:', err);
                return;
            }
        }

        if (!resolvedCellId) return;

        setCommentPanelCell({ cellId: resolvedCellId, sheetId: docName, permission });
        setCommentsLoading(true);
        setCommentsList([]);
        setNewCommentText('');
        setEditingComment(null);
        try {
            const resp = await apiClient.get(`/sheets/${docName}/cells/${resolvedCellId}/comments`);
            setCommentsList(resp.data.data || []);
        } catch (err) {
            console.error('Error loading comments:', err);
        } finally {
            setCommentsLoading(false);
        }
    };

    const closeCommentPanel = () => {
        setCommentPanelCell(null);
        setCommentsList([]);
        setNewCommentText('');
        setEditingComment(null);
    };

    const handleAddComment = async () => {
        if (!newCommentText.trim() || !commentPanelCell || commentSubmitting) return;
        setCommentSubmitting(true);
        try {
            const resp = await apiClient.post(
                `/sheets/${commentPanelCell.sheetId}/cells/${commentPanelCell.cellId}/comments`,
                { text: newCommentText.trim() }
            );
            setCommentsList(prev => [...prev, resp.data.data]);
            setNewCommentText('');
            // Increment local comment count
            setCommentCounts(prev => ({
                ...prev,
                [commentPanelCell.cellId]: (prev[commentPanelCell.cellId] || 0) + 1
            }));
        } catch (err) {
            console.error('Error adding comment:', err);
            alert('Failed to add comment. Please try again.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    const handleEditComment = async (commentId) => {
        if (!editingComment || !editingComment.text.trim() || commentSubmitting) return;
        setCommentSubmitting(true);
        try {
            const resp = await apiClient.put(
                `/sheets/${commentPanelCell.sheetId}/cells/${commentPanelCell.cellId}/comments/${commentId}`,
                { text: editingComment.text.trim() }
            );
            setCommentsList(prev => prev.map(c => c.id === commentId ? { ...c, text: resp.data.data.text, updatedAt: resp.data.data.updatedAt } : c));
            setEditingComment(null);
        } catch (err) {
            console.error('Error editing comment:', err);
            alert('Failed to edit comment.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    const handleDeleteComment = (commentId) => {
        setCommentToDeleteId(commentId);
        setShowCommentDeleteConfirmModal(true);
    };

    const confirmDeleteComment = async () => {
        if (!commentToDeleteId || commentSubmitting) return;
        setCommentSubmitting(true);
        try {
            await apiClient.delete(
                `/sheets/${commentPanelCell.sheetId}/cells/${commentPanelCell.cellId}/comments/${commentToDeleteId}`
            );
            setCommentsList(prev => prev.filter(c => c.id !== commentToDeleteId));
            setCommentCounts(prev => {
                const newCount = Math.max(0, (prev[commentPanelCell.cellId] || 1) - 1);
                if (newCount === 0) {
                    const updated = { ...prev };
                    delete updated[commentPanelCell.cellId];
                    return updated;
                }
                return { ...prev, [commentPanelCell.cellId]: newCount };
            });
            setShowCommentDeleteConfirmModal(false);
            setCommentToDeleteId(null);
        } catch (err) {
            console.error('Error deleting comment:', err);
            alert('Failed to delete comment.');
        } finally {
            setCommentSubmitting(false);
        }
    };

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    // Fetch latest comment for tooltip preview
    const handleCommentHover = async (cellId) => {
        if (!cellId || !docName) return;
        setHoveredCommentCell(cellId);
        try {
            const resp = await apiClient.get(`/sheets/${docName}/cells/${cellId}/comments`);
            const comments = resp.data.data || [];
            if (comments.length > 0) {
                const latest = comments[comments.length - 1];
                setLatestCommentPreview({ cellId, text: latest.text, author: latest.author?.name || 'Unknown' });
            }
        } catch (_) { /* silent */ }
    };

    // Compute filtered rows based on active filters
    const filteredRows = rows.filter(row => {
        return Object.entries(columnFilters).every(([colId, filterText]) => {
            if (!filterText) return true;
            const cell = row.cells?.find(c => c.columnId === colId);
            const val = String(cell?.computedValue ?? cell?.rawValue ?? '').toLowerCase();
            return val.includes(filterText.toLowerCase());
        });
    });

    // Sort rows — stacked on top of filteredRows, safe and independent
    const sortedRows = useMemo(() => {
        if (!sortConfig.colId) return filteredRows;
        const col = columns.find(c => c.id === sortConfig.colId);
        if (!col) return filteredRows;

        const UNSORTABLE = ['multi_image', 'pdf', 'comment'];
        if (UNSORTABLE.includes(col.type)) return filteredRows;

        return [...filteredRows].sort((a, b) => {
            const cellA = a.cells?.find(c => c.columnId === sortConfig.colId);
            const cellB = b.cells?.find(c => c.columnId === sortConfig.colId);
            const rawA = cellA?.computedValue ?? cellA?.rawValue ?? '';
            const rawB = cellB?.computedValue ?? cellB?.rawValue ?? '';

            // Empty values always go to the bottom regardless of direction
            const emptyA = rawA === '' || rawA === null || rawA === undefined;
            const emptyB = rawB === '' || rawB === null || rawB === undefined;
            if (emptyA && emptyB) return 0;
            if (emptyA) return 1;
            if (emptyB) return -1;

            const dir = sortConfig.direction === 'asc' ? 1 : -1;

            if (col.type === 'number' || col.type === 'formula') {
                return (parseFloat(rawA) - parseFloat(rawB)) * dir;
            }
            if (col.type === 'currency') {
                const numA = parseFloat(String(rawA).replace(/[^0-9.-]/g, ''));
                const numB = parseFloat(String(rawB).replace(/[^0-9.-]/g, ''));
                return (numA - numB) * dir;
            }
            if (col.type === 'date') {
                return (new Date(rawA) - new Date(rawB)) * dir;
            }
            if (col.type === 'time') {
                // HH:MM 24h format sorts lexicographically
                return String(rawA).localeCompare(String(rawB)) * dir;
            }
            // Default: text sort
            return String(rawA).localeCompare(String(rawB)) * dir;
        });
    }, [filteredRows, sortConfig, columns]);

    // Toggle sort on column header click
    const handleColumnSort = (colId) => {
        const UNSORTABLE = ['multi_image', 'pdf', 'comment'];
        const col = columns.find(c => c.id === colId);
        if (!col || UNSORTABLE.includes(col.type)) return;

        // Compute next sort config from current state (read sortConfig directly, not updater pattern)
        let next;
        if (sortConfig.colId === colId) {
            if (sortConfig.direction === 'asc') next = { colId, direction: 'desc' };
            else next = { colId: null, direction: 'asc' }; // third click clears sort
        } else {
            next = { colId, direction: 'asc' };
        }

        // Update local state immediately
        setSortConfig(next);

        // Persist to backend as a clean side effect
        console.log('[SORT] Persisting sort to backend:', next);
        apiClient.patch(`/sheets/${docName}/sort`, { sortConfig: next })
            .then(res => console.log('[SORT] Saved successfully:', res.data))
            .catch(err => console.error('[SORT] Error persisting sort:', err.response?.data || err.message));
    };

    const getColumnCalcValue = (colId, mode) => {
        const numericValues = rows
            .map(row => {
                const cell = row.cells?.find(c => c.columnId === colId);
                const v = cell?.computedValue ?? cell?.rawValue ?? '';
                return parseFloat(v);
            })
            .filter(n => !isNaN(n));

        if (numericValues.length === 0) return 0;

        const colDef = columns.find(c => c.id === colId);
        let result = null;

        if (mode === 'total') {
            result = numericValues.reduce((sum, n) => sum + n, 0);
        } else if (mode === 'average') {
            result = numericValues.reduce((sum, n) => sum + n, 0) / numericValues.length;
        }

        if (result === null) return null;
        return colDef?.type === 'currency' ? formatCurrency(result, colDef.currencyCode) : (mode === 'average' ? result.toFixed(2) : result);
    };

    const columnTypes = [
        { id: 'text', icon: <span className="text-blue-500 font-serif text-base">T</span>, name: 'Text', desc: 'Insert alpha numeric values in a cell' },
        { id: 'number', icon: <span className="text-blue-500 font-medium text-xs">123</span>, name: 'Number', desc: 'Insert numbers in a cell' },
        { id: 'date', icon: <FiCalendar className="text-blue-500 text-base" />, name: 'Date', desc: 'Pick or type a date value' },
        { id: 'time', icon: <FiClock className="text-blue-500 text-base" />, name: 'Time', desc: 'Auto-fills with system time; editable' },

        { id: 'currency', icon: <span className="text-blue-500 text-base">₹</span>, name: 'Currency', desc: 'Format number to currency' },
        { id: 'formula', icon: <span className="text-blue-500 italic font-serif text-base">fx</span>, name: 'Formula', desc: 'Create formula for automatic calculation' },
        { id: 'multi_image', icon: <FiImage className="text-blue-500 w-4 h-4" />, name: 'Image', desc: 'Add multiple images in a cell' },
        { id: 'pdf', icon: <FiFileText className="text-blue-500 w-4 h-4" />, name: 'PDF', desc: 'Add multiple PDF documents in a cell' },
        { id: 'comment', icon: <FiMessageSquare className="text-blue-500 w-4 h-4" />, name: 'Comments', desc: 'Add comments to a cell' }
    ];

    const handleAddColumnClick = () => {
        setNewColumnName('');
        setNewColumnType('text');
        setNewColumnWidth(220);
        setNewColumnIsDetailedView(false);
        setEditingColId(null);
        setNewColumnIsUnderline(false);
        setNewColumnIsStrikethrough(false);
        setNewColumnFontFamily('sans');
        setNewColumnAlignment('left');
        setIsColumnModalOpen(true);
    };

    const handleEditColumnClick = (col) => {
        setNewColumnName(col.name);
        setNewColumnType(col.type);
        setNewColumnCurrencyCode(col.currencyCode || 'INR');
        setNewColumnBgColor(col.bgColor || null);
        setNewColumnIsBold(col.isBold || false);
        setNewColumnIsItalic(col.isItalic || false);
        setNewColumnWidth(col.width || 220);
        setNewColumnIsUnderline(col.isUnderline || false);
        setNewColumnIsStrikethrough(col.isStrikethrough || false);
        setNewColumnFontFamily(col.fontFamily || 'sans');
        setNewColumnAlignment(col.alignment || 'left');

        const opts = parseOptions(col.options);
        setNewColumnIsDetailedView(!!opts.isDetailedViewEnabled);

        setEditingColId(col.id);
        setIsColumnModalOpen(true);
        setActiveColumnMenu(null);
    };

    const handleUpdateColumn = () => {
        if (!newColumnName.trim()) return;

        if (editingColId) {
            const originalCol = columns.find(c => c.id === editingColId);
            const nameChanged = originalCol?.name !== newColumnName.trim();
            const typeChanged = originalCol?.type !== newColumnType;

            if (!nameChanged && !typeChanged) {
                // Only styling (color, bold, etc) or nothing changed, save directly
                performUpdateColumn();
                return;
            }
        }

        setShowUpdateConfirmModal(true);
    };

    const performUpdateColumn = async () => {
        setShowUpdateConfirmModal(false);

        const originalCol = editingColId ? columns.find(c => c.id === editingColId) : null;
        const isTypeChanged = originalCol ? originalCol.type !== newColumnType : true;

        // If it's a new formula column or explicitly changed to formula, open the formula builder
        if (newColumnType === 'formula' && isTypeChanged) {
            setPendingFormulaColumnDesc({
                name: newColumnName,
                type: newColumnType,
                id: editingColId,
                currencyCode: newColumnCurrencyCode // Save selected currency for formulas
            });
            setIsColumnModalOpen(false);
            setIsFormulaModalOpen(true);
            return;
        }

        await saveColumnToBackend(
            newColumnName,
            newColumnType,
            editingColId,
            undefined,
            newColumnBgColor,
            newColumnIsBold,
            newColumnIsItalic,
            newColumnWidth,
            newColumnIsUnderline,
            newColumnIsStrikethrough,
            newColumnFontFamily,
            newColumnAlignment
        );
    };

    const saveColumnToBackend = async (
        name,
        type,
        colId,
        formulaExpr = undefined,
        bgColor = null,
        isBold = false,
        isItalic = false,
        width = 220,
        isUnderline = false,
        isStrikethrough = false,
        fontFamily = 'sans',
        alignment = 'left'
    ) => {
        try {
            const currencyPayload = type === 'currency' ? { currencyCode: newColumnCurrencyCode } : {};
            const options = {
                isDetailedViewEnabled: newColumnIsDetailedView
            };

            if (colId) {
                // Update existing column
                await apiClient.put(`/sheets/${docName}/columns/${colId}`, {
                    name,
                    type,
                    bgColor,
                    isBold,
                    isItalic,
                    isUnderline,
                    isStrikethrough,
                    fontFamily,
                    alignment,
                    width,
                    options,
                    ...currencyPayload,
                    ...(formulaExpr ? { formulaExpr } : {})
                });

                setColumns(cols => cols.map(c =>
                    c.id === colId
                        ? { ...c, name, type, formulaExpr, bgColor, isBold, isItalic, isUnderline, isStrikethrough, fontFamily, alignment, width, options, ...currencyPayload }
                        : c
                ));

                // Refresh data to get computed formula values
                fetchSheetData();
            } else {
                // Add new column
                const response = await apiClient.post(`/sheets/${docName}/columns`, {
                    name,
                    type,
                    width,
                    bgColor,
                    isBold,
                    isItalic,
                    isUnderline,
                    isStrikethrough,
                    fontFamily,
                    alignment,
                    options,
                    ...currencyPayload,
                    ...(formulaExpr ? { formulaExpr } : {})
                });

                setColumns([...columns, response.data.data]);

                // Refresh data to get correct grid cells
                fetchSheetData();
            }
        } catch (error) {
            console.error("Error saving column:", error);
        }

        setIsColumnModalOpen(false);
        setIsFormulaModalOpen(false);
        setEditingColId(null);
        setPendingFormulaColumnDesc(null);
        setFormulaString('');
    };



    const updateRowStyle = async (rowId, stylePatch) => {
        try {
            // stylePatch = { rowColor, isBold, isItalic }
            // Optimistic update
            setRows(currentRows => currentRows.map(row =>
                row.id === rowId ? { ...row, ...stylePatch } : row
            ));

            // Sync with backend
            await apiClient.patch(`/sheets/${docName}/rows/${rowId}/color`, stylePatch);
        } catch (error) {
            console.error("Error updating row style:", error);
            fetchSheetData();
        }
    };

    const updateCellStyle = async (rowId, columnId, stylePatch) => {
        try {
            // Optimistic update — merge stylePatch into the matching cell
            setRows(currentRows => currentRows.map(row => {
                if (row.id === rowId) {
                    const cells = row.cells || [];
                    const cellExists = cells.some(c => c.columnId === columnId);
                    const newCells = cellExists
                        ? cells.map(c => c.columnId === columnId ? { ...c, ...stylePatch } : c)
                        : [...cells, { columnId, rawValue: '', computedValue: '', ...stylePatch }];
                    return { ...row, cells: newCells };
                }
                return row;
            }));

            // Sync with backend
            await apiClient.post(`/sheets/${docName}/cells`, {
                rowId,
                columnId,
                ...stylePatch
            });
        } catch (error) {
            console.error("Error updating cell style:", error);
            fetchSheetData();
        }
    };

    const updateColumnStyle = async (colId, stylePatch) => {
        try {
            // stylePatch = { bgColor, isBold, isItalic }
            // Optimistic update
            setColumns(currentCols => currentCols.map(col =>
                col.id === colId ? { ...col, ...stylePatch } : col
            ));

            // Sync with backend
            await apiClient.put(`/sheets/${docName}/columns/${colId}`, stylePatch);
        } catch (error) {
            console.error("Error updating column style:", error);
            fetchSheetData();
        }
    };

    const getCellFormattingClasses = (cell, row, col, isFormula = false) => {
        const classes = [];
        if (cell?.isBold || row?.isBold || col?.isBold) classes.push('font-bold');
        if (cell?.isItalic || row?.isItalic || col?.isItalic) classes.push('italic');
        if (cell?.isUnderline || row?.isUnderline || col?.isUnderline) classes.push('underline');
        if (cell?.isStrikethrough || row?.isStrikethrough || col?.isStrikethrough) classes.push('line-through');

        const family = cell?.fontFamily || row?.fontFamily || col?.fontFamily || 'sans';
        if (family === 'mono') classes.push('font-mono');
        else if (family === 'serif') classes.push('font-serif');
        else classes.push('font-sans');

        const align = cell?.alignment || row?.alignment || col?.alignment || (col?.type === 'number' || col?.type === 'currency' || isFormula ? 'right' : 'left');
        if (align === 'right') classes.push('text-right');
        else if (align === 'center') classes.push('text-center');
        else classes.push('text-left');

        return classes.join(' ');
    };

    // --- Column Menu Actions ---
    const handleDeleteClick = (col) => {
        setColumnToDelete(col);
        setShowDeleteConfirmModal(true);
        setActiveColumnMenu(null);
    };

    const handleOpenOrCreateDetails = async (row, col) => {
        const mappingKey = `${row.id}_${col.id}`;
        const existingId = nestedSheetsMapping[mappingKey];

        if (existingId) {
            setActiveNestedSheetId(existingId);
            return;
        }

        // Auto-create sub-sheet
        try {
            const cell = row.cells?.find(c => c.columnId === col.id);
            const cellValue = cell?.computedValue ?? cell?.rawValue;
            const rowNo = (row.order !== undefined ? row.order + 1 : filteredRows.indexOf(row) + 1);
            const defaultName = (cellValue && cellValue.toString().trim() !== "")
                ? cellValue.toString().trim()
                : `${col.name}-${rowNo}`;

            const opts = parseOptions(col.options);
            const hasTemplate = opts.ccTemplateColumns && Array.isArray(opts.ccTemplateColumns) && opts.ccTemplateColumns.length > 0;

            const response = await apiClient.post('/sheets', {
                name: defaultName,
                folderId: null,
                isDetailedView: true,
                columns: hasTemplate ? opts.ccTemplateColumns : undefined
            });
            const newDocId = response.data.data.id;

            // Update mapping locally
            setNestedSheetsMapping(prev => ({ ...prev, [mappingKey]: newDocId }));

            // Save relationship to cell in backend
            await apiClient.post(`/sheets/${docName}/cells`, {
                rowId: row.id,
                columnId: col.id,
                nestedSheetId: newDocId
            });

            setActiveNestedSheetId(newDocId);
            fetchSheetData();
        } catch (e) {
            console.error("Error auto-creating nested sheet", e);
            if (e.response && e.response.status === 403) {
                alert("You do not have permission to create or access this C.C. detail.");
            } else {
                alert("Failed to initialize C.C.");
            }
        }
    };

    const performEnableRow = async () => {
        const row = filteredRows[rowToEnable];
        const colId = editingColId; // repurposed
        if (row && colId) {
            try {
                // Create sub-sheet
                const cell = row.cells?.find(c => c.columnId === colId);
                const cellValue = cell?.computedValue ?? cell?.rawValue;
                const rowNo = (row.order !== undefined ? row.order + 1 : filteredRows.indexOf(row) + 1);
                const col = columns.find(c => c.id === colId);
                const defaultName = (cellValue && cellValue.toString().trim() !== "")
                    ? cellValue.toString().trim()
                    : `${col?.name || 'Column'}-${rowNo}`;

                const opts = parseOptions(col.options);
                const hasTemplate = opts.ccTemplateColumns && Array.isArray(opts.ccTemplateColumns) && opts.ccTemplateColumns.length > 0;

                const response = await apiClient.post('/sheets', {
                    name: newNestedSheetName || defaultName,
                    folderId: null,
                    isDetailedView: true,
                    columns: hasTemplate ? opts.ccTemplateColumns : undefined
                });
                const newDocId = response.data.data.id;

                // Update mapping locally
                setNestedSheetsMapping(prev => ({ ...prev, [`${row.id}_${colId}`]: newDocId }));

                // Save relationship to cell in backend
                await apiClient.post(`/sheets/${docName}/cells`, {
                    rowId: row.id,
                    columnId: colId,
                    nestedSheetId: newDocId
                });

                fetchSheetData();
            } catch (e) { console.error("Error creating nested sheet", e); }
        }
        setShowEnableRowModal(false);
        setRowToEnable(null);
        setEditingColId(null);
    };

    const handleCCConfigConfirm = async () => {
        if (!configuringCCColId || ccTemplateColumns.length === 0) return;

        // Filter out empty names if any (though UI should prevent it)
        const validColumns = ccTemplateColumns.filter(c => c.name.trim() !== "");
        if (validColumns.length === 0) return;

        const col = columns.find(c => c.id === configuringCCColId);
        if (col) {
            const opts = parseOptions(col.options);
            const newOpts = {
                ...opts,
                isDetailedViewEnabled: true,
                ccTemplateColumns: validColumns.map(c => ({
                    name: c.name.trim(),
                    type: c.type
                }))
            };
            await updateColumnStyle(col.id, { options: newOpts });
        }

        setIsCCConfigModalOpen(false);
        setConfiguringCCColId(null);
        setCcTemplateColumns([{ name: '', type: 'text' }]);
    };

    const performRenameSubSheet = async () => {
        if (!renamingSubSheetId || !renamingSubSheetName.trim()) return;
        try {
            await apiClient.put(`/sheets/${renamingSubSheetId}`, { name: renamingSubSheetName.trim() });
            fetchSheetData(); // refresh parent mapping
            refreshFormulaValues(); // refresh locally
        } catch (err) {
            console.error("Error renaming sub-sheet:", err);
        } finally {
            setShowRenameSubSheetModal(false);
            setRenamingSubSheetId(null);
            setRenamingSubSheetName('');
        }
    };

    const performDeleteColumn = async () => {
        if (!columnToDelete) return;
        const colId = columnToDelete.id;
        setShowDeleteConfirmModal(false);
        try {
            await apiClient.delete(`/sheets/${docName}/columns/${colId}`);
            setColumns(cols => cols.filter(c => c.id !== colId));
            // Clear any filter on the deleted column
            setColumnFilters(prev => {
                const updated = { ...prev };
                delete updated[colId];
                return updated;
            });
            fetchSheetData();
        } catch (error) {
            console.error("Error deleting column:", error);
            alert("Failed to delete column.");
        }
        setColumnToDelete(null);
    };

    const handleAddColumnDirection = async (colId, direction) => {
        const colIndex = columns.findIndex(c => c.id === colId);
        if (colIndex === -1) return;
        setActiveColumnMenu(null);

        try {
            // Use the actual orderIndex from the column, not the array index
            const clickedCol = columns[colIndex];
            const insertIndex = direction === 'left' ? clickedCol.orderIndex : clickedCol.orderIndex + 1;
            // Generate column name like "Column D", "Column E" etc.
            const letter = String.fromCharCode(65 + columns.length); // A=65
            const colName = `Column ${letter}`;

            await apiClient.post(`/sheets/${docName}/columns`, {
                name: colName,
                type: 'text',
                width: 220,
                orderIndex: insertIndex
            });

            // Refresh data to get the new column with correct grid cells
            fetchSheetData();
        } catch (error) {
            console.error("Error adding column:", error);
        }
    };

    const handleSortColumn = (colId, direction) => {
        setRows(currentRows => {
            const sorted = [...currentRows].sort((a, b) => {
                const cellA = a.cells?.find(c => c.columnId === colId);
                const cellB = b.cells?.find(c => c.columnId === colId);
                const valA = cellA?.computedValue ?? cellA?.rawValue ?? '';
                const valB = cellB?.computedValue ?? cellB?.rawValue ?? '';

                // Date comparison for date columns
                const colDef = columns.find(c => c.id === colId);
                if (colDef?.type === 'date') {
                    const dateA = new Date(valA);
                    const dateB = new Date(valB);
                    if (!isNaN(dateA) && !isNaN(dateB)) {
                        return direction === 'asc' ? dateA - dateB : dateB - dateA;
                    }
                }

                // Try numeric comparison first
                const numA = parseFloat(valA);
                const numB = parseFloat(valB);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return direction === 'asc' ? numA - numB : numB - numA;
                }

                // Fallback to string comparison
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                if (direction === 'asc') return strA.localeCompare(strB);
                return strB.localeCompare(strA);
            });
            return sorted;
        });
        setActiveColumnMenu(null);
    };

    const handleRenameColumnClick = (colId) => {
        const col = columns.find(c => c.id === colId);
        if (col) {
            handleEditColumnClick(col); // Use the new handler
        }
        setActiveColumnMenu(null);
    };

    const handleFilterColumnClick = (colId) => {
        // Toggle filter: if filter exists, clear it; otherwise, set empty to show input
        setColumnFilters(prev => {
            const updated = { ...prev };
            if (colId in updated) {
                delete updated[colId];
            } else {
                updated[colId] = '';
            }
            return updated;
        });
        setActiveColumnMenu(null);
    };

    const handleSetFormulaClick = (colId) => {
        const col = columns.find(c => c.id === colId);
        if (!col) return;
        setPendingFormulaColumnDesc({
            name: col.name,
            type: 'formula',
            id: col.id
        });
        // Pre-fill formula if one already exists (strip leading '=' for display)
        const existingFormula = col.formulaExpr || '';
        setFormulaString(existingFormula.startsWith('=') ? existingFormula.slice(1) : existingFormula);
        setActiveColumnMenu(null);
        setIsFormulaModalOpen(true);
    };

    // --- Cell Menu Actions ---
    const handleRowContextMenu = (e, rowIndex) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveCellMenu(null); // Close cell menu if open
        setActiveRowMenu({
            x: e.clientX,
            y: e.clientY,
            rowIndex
        });
    };

    const handleCellContextMenu = (e, rowIndex, colId) => {
        e.preventDefault();
        setActiveRowMenu(null); // Close row menu if open
        setActiveCellMenu({
            x: e.clientX,
            y: e.clientY,
            rowIndex,
            colId
        });
        setActiveColumnMenu(null); // Close column menu if open
    };

    const handleCellAction = async (action, overrideRowIndex = null, overrideColId = null) => {
        let rowIndex = overrideRowIndex;
        let colId = overrideColId;

        if (rowIndex === null && activeCellMenu) {
            rowIndex = activeCellMenu.rowIndex;
            colId = activeCellMenu.colId;
        }

        if (rowIndex === null) return;

        // Use filteredRows to get the correct row when filters are active
        const row = filteredRows[rowIndex];
        if (!row) return;

        try {
            switch (action) {
                case 'add_row_above':
                    await apiClient.post(`/sheets/${docName}/rows`, { targetRowId: row.id, position: 'above' });
                    fetchSheetData();
                    break;
                case 'add_row_below':
                    await apiClient.post(`/sheets/${docName}/rows`, { targetRowId: row.id, position: 'below' });
                    fetchSheetData();
                    break;
                case 'add_row':
                    await apiClient.post(`/sheets/${docName}/rows`, {});
                    fetchSheetData();
                    break;
                case 'delete_row':
                    if (row && row.id) {
                        await apiClient.delete(`/sheets/${docName}/rows/${row.id}`);
                        fetchSheetData();
                    }
                    break;
                case 'remove_cc':
                    if (row && row.id && colId) {
                        const mappingKey = `${row.id}_${colId}`;
                        const nestedId = nestedSheetsMapping[mappingKey];
                        if (nestedId) {
                            try {
                                await apiClient.delete(`/sheets/${nestedId}`);
                            } catch (e) {
                                console.error("Failed to delete C.C. sheet", e);
                            }
                            await apiClient.post(`/sheets/${docName}/cells`, {
                                rowId: row.id,
                                columnId: colId,
                                nestedSheetId: null
                            });
                            setNestedSheetsMapping(prev => {
                                const next = { ...prev };
                                delete next[mappingKey];
                                return next;
                            });
                            fetchSheetData();
                        }
                    }
                    break;
                case 'erase_data':
                    if (row && row.id && colId) {
                        await handleCellChange(row.id, colId, "");
                    }
                    break;
                case 'toggle_bold':
                    if (row && colId) {
                        const cell = row.cells?.find(c => c.columnId === colId);
                        await updateCellStyle(row.id, colId, { isBold: !cell?.isBold });
                    }
                    break;
                case 'toggle_italic':
                    if (row && colId) {
                        const cell = row.cells?.find(c => c.columnId === colId);
                        await updateCellStyle(row.id, colId, { isItalic: !cell?.isItalic });
                    }
                    break;
                case 'toggle_underline':
                    if (row && colId) {
                        const cell = row.cells?.find(c => c.columnId === colId);
                        await updateCellStyle(row.id, colId, { isUnderline: !cell?.isUnderline });
                    }
                    break;
                case 'toggle_strikethrough':
                    if (row && colId) {
                        const cell = row.cells?.find(c => c.columnId === colId);
                        await updateCellStyle(row.id, colId, { isStrikethrough: !cell?.isStrikethrough });
                    }
                    break;
                case 'font_sans':
                    if (row && colId) await updateCellStyle(row.id, colId, { fontFamily: 'sans' });
                    break;
                case 'font_serif':
                    if (row && colId) await updateCellStyle(row.id, colId, { fontFamily: 'serif' });
                    break;
                case 'font_mono':
                    if (row && colId) await updateCellStyle(row.id, colId, { fontFamily: 'mono' });
                    break;
                case 'align_left':
                    if (row && colId) await updateCellStyle(row.id, colId, { alignment: 'left' });
                    break;
                case 'align_center':
                    if (row && colId) await updateCellStyle(row.id, colId, { alignment: 'center' });
                    break;
                case 'align_right':
                    if (row && colId) await updateCellStyle(row.id, colId, { alignment: 'right' });
                    break;
                case 'copy':
                    if (row && colId) {
                        const cell = row.cells?.find(c => c.columnId === colId);
                        setCellClipboard({ rawValue: cell?.rawValue || "" });
                        console.log("Copied cell data:", cell?.rawValue);
                    }
                    break;
                case 'paste':
                    if (row && colId && cellClipboard) {
                        await handleCellChange(row.id, colId, cellClipboard.rawValue);
                        console.log("Pasted cell data:", cellClipboard.rawValue);
                    }
                    break;
                case 'enable_row_in_column':
                    console.log(`Enabling row in column for row ID: ${row?.id}`);
                    // Add API integration here when business logic is finalized
                    break;
                default:
                    console.log(`Cell action: ${action} on row ${rowIndex}, col ${colId}`);
                    break;
            }
        } catch (error) {
            console.error("Error performing cell action:", error);
        }

        setActiveCellMenu(null);
    };

    const handleCellChange = async (rowId, columnId, value) => {
        // Enforce constraints
        const colDef = columns.find(c => c.id === columnId);
        let finalValue = value;
        if (colDef && colDef.type === 'number') {
            if (value !== '' && isNaN(Number(value))) {
                return; // Ignore invalid values
            }
        } else if (colDef && colDef.type === 'currency') {
            finalValue = parseCurrencyInput(value);
        } else if (colDef && colDef.type === 'date') {
            // Allow empty value to clear, validate non-empty
            if (value !== '' && isNaN(new Date(value).getTime())) {
                return; // Reject invalid date
            }
        } else if (colDef && colDef.type === 'time') {
            // Allow empty value to clear, validate HH:MM format for non-empty
            if (value !== '' && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)) {
                return; // Reject invalid time
            }
        }

        try {
            // Optimistic update
            setRows(currentRows => currentRows.map(row => {
                if (row.id === rowId) {
                    let cellExists = false;
                    const newCells = (row.cells || []).map(cell => {
                        if (cell.columnId === columnId) {
                            cellExists = true;
                            return { ...cell, rawValue: finalValue, computedValue: finalValue };
                        }
                        return cell;
                    });
                    if (!cellExists) {
                        newCells.push({
                            columnId: columnId,
                            rawValue: finalValue,
                            computedValue: finalValue
                        });
                    }
                    return { ...row, cells: newCells };
                }
                return row;
            }));

            // Sync with backend
            await apiClient.post(`/sheets/${docName}/cells`, {
                rowId,
                columnId,
                rawValue: finalValue
            });

            // Re-fetch formula values silently (debounced, no loading spinner)
            const hasFormulaCols = columns.some(c => c.type === 'formula');
            if (hasFormulaCols || colDef?.type === 'currency') {
                debouncedRefreshFormulas();
            }
        } catch (error) {
            console.error("Error saving cell:", error);
        }
    };

    // --- Multi-Image Upload Logic ---
    const handleImageGalleryOpen = (rowId, colId, value, permission) => {
        let parsedImages = [];
        try { if (value) parsedImages = JSON.parse(value); } catch { }
        if (!Array.isArray(parsedImages)) parsedImages = [];
        setActiveImageCell({ rowId, colId, images: parsedImages, permission });
        setIsImageGalleryOpen(true);
    };

    const handleImagesSelected = async (e) => {
        if (!e.target.files?.length) return;
        setIsUploadingImages(true);
        const formData = new FormData();
        Array.from(e.target.files).forEach(f => formData.append("files", f));

        try {
            const resp = await apiClient.post(`/media/upload-multiple`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const uploadedMeta = resp.data.data.map(f => ({
                url: f.fileUrl,
                fileName: f.originalName,
                fileSize: f.sizeBytes,
                mimeType: f.mimeType,
                uploadedAt: f.createdAt || new Date().toISOString()
            }));

            const newImagesList = [...(activeImageCell.images || []), ...uploadedMeta];

            // Update modal state
            setActiveImageCell(prev => ({ ...prev, images: newImagesList }));

            // Save to cell instantly
            await handleCellChange(activeImageCell.rowId, activeImageCell.colId, JSON.stringify(newImagesList));

        } catch (error) {
            console.error("Failed to upload images:", error);
            alert("Upload failed. Validation error or file too large.");
        } finally {
            setIsUploadingImages(false);
            e.target.value = null; // reset file input
        }
    };

    const handleDeleteImage = (index) => {
        setImageToDeleteIndex(index);
        setShowImageDeleteConfirmModal(true);
    };

    const confirmDeleteImage = async () => {
        if (imageToDeleteIndex === null) return;

        const newImagesList = activeImageCell.images.filter((_, i) => i !== imageToDeleteIndex);
        setActiveImageCell(prev => ({ ...prev, images: newImagesList }));
        await handleCellChange(activeImageCell.rowId, activeImageCell.colId, JSON.stringify(newImagesList));

        setShowImageDeleteConfirmModal(false);
        setImageToDeleteIndex(null);
    };

    const handlePrevImage = useCallback((e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (!activeImageCell?.images || activeImageCell.images.length <= 1) return;
        setActivePreviewIndex(prev => {
            const nextIndex = (prev === null || prev === 0) ? activeImageCell.images.length - 1 : prev - 1;
            setSelectedPreviewImage(getMediaUrl(activeImageCell.images[nextIndex].url));
            return nextIndex;
        });
    }, [activeImageCell]);

    const handleNextImage = useCallback((e) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        if (!activeImageCell?.images || activeImageCell.images.length <= 1) return;
        setActivePreviewIndex(prev => {
            const nextIndex = (prev === null || prev === activeImageCell.images.length - 1) ? 0 : prev + 1;
            setSelectedPreviewImage(getMediaUrl(activeImageCell.images[nextIndex].url));
            return nextIndex;
        });
    }, [activeImageCell]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedPreviewImage) return;
            if (e.key === 'ArrowLeft') {
                handlePrevImage();
            } else if (e.key === 'ArrowRight') {
                handleNextImage();
            } else if (e.key === 'Escape') {
                setSelectedPreviewImage(null);
                setActivePreviewIndex(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedPreviewImage, handlePrevImage, handleNextImage]);

    // --- PDF Upload Logic ---
    const handlePDFGalleryOpen = (rowId, colId, value, permission) => {
        let parsedPDFs = [];
        try { if (value) parsedPDFs = JSON.parse(value); } catch { }
        if (!Array.isArray(parsedPDFs)) parsedPDFs = [];
        setActivePDFCell({ rowId, colId, documents: parsedPDFs, permission });
        setIsPDFGalleryOpen(true);
    };

    const handlePDFsSelected = async (e) => {
        if (!e.target.files?.length) return;

        const files = Array.from(e.target.files);
        const nonPDFs = files.filter(f => f.type !== 'application/pdf');
        if (nonPDFs.length > 0) {
            alert("Only PDF files are allowed in this column.");
            e.target.value = null;
            return;
        }

        setIsUploadingPDFs(true);
        const formData = new FormData();
        files.forEach(f => formData.append("files", f));

        try {
            const resp = await apiClient.post(`/media/upload-multiple`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const uploadedMeta = resp.data.data.map(f => ({
                url: f.fileUrl,
                fileName: f.originalName,
                fileSize: f.sizeBytes,
                mimeType: f.mimeType,
                uploadedAt: f.createdAt || new Date().toISOString()
            }));

            const newPDFList = [...(activePDFCell.documents || []), ...uploadedMeta];

            // Update modal state
            setActivePDFCell(prev => ({ ...prev, documents: newPDFList }));

            // Save to cell instantly
            await handleCellChange(activePDFCell.rowId, activePDFCell.colId, JSON.stringify(newPDFList));

        } catch (error) {
            console.error("Failed to upload PDFs:", error);
            alert("Upload failed. Validation error or file too large.");
        } finally {
            setIsUploadingPDFs(false);
            e.target.value = null; // reset file input
        }
    };

    const handleDeletePDF = (index) => {
        setPdfToDeleteIndex(index);
        setShowPDFDeleteConfirmModal(true);
    };

    const confirmDeletePDF = async () => {
        if (pdfToDeleteIndex === null) return;

        const newPDFList = activePDFCell.documents.filter((_, i) => i !== pdfToDeleteIndex);
        setActivePDFCell(prev => ({ ...prev, documents: newPDFList }));
        await handleCellChange(activePDFCell.rowId, activePDFCell.colId, JSON.stringify(newPDFList));

        setShowPDFDeleteConfirmModal(false);
        setPdfToDeleteIndex(null);
    };

    // handleCellBlur has been removed; logic is now inside onBlur handlers for inputs

    const handleAddRow = async () => {
        try {
            const resp = await apiClient.post(`/sheets/${docName}/rows`, {});
            const newRow = resp.data.data;

            // Optimistically add the row to local state using the API response
            // This is more reliable than depending on socket events
            setRows(prev => {
                if (prev.some(r => r.id === newRow.id)) return prev;

                // Build empty cells for the new row using the current column structure
                const templateRow = prev.find(r => r.cells && r.cells.length > 0);
                const emptyCells = templateRow
                    ? templateRow.cells.map(c => ({
                        columnId: c.columnId,
                        rowId: newRow.id,
                        rawValue: '',
                        computedValue: '',
                        formattedValue: ''
                    }))
                    : columns.map(c => ({
                        columnId: c.id,
                        rowId: newRow.id,
                        rawValue: '',
                        computedValue: '',
                        formattedValue: ''
                    }));

                return [...prev, { ...newRow, cells: emptyCells }].sort((a, b) => (a.order || 0) - (b.order || 0));
            });
        } catch (error) {
            console.error("Error adding row:", error);
        }
    };

    // const handleDownloadBackup = async () => {
    //     try {
    //         const res = await apiClient.get(`/sheets/${docName}/export`, { responseType: 'blob' });
    //         const url = window.URL.createObjectURL(new Blob([res.data]));
    //         const link = document.createElement('a');
    //         link.href = url;
    //         const dateStr = new Date().toISOString().split('T')[0];
    //         link.setAttribute('download', `spreadsheet_backup_${docName}_${dateStr}.json`);
    //         document.body.appendChild(link);
    //         link.click();
    //         link.parentNode.removeChild(link);
    //     } catch (err) {
    //         console.error("Backup failed", err);
    //     }
    // };

    const executePDFExport = async () => {
        try {
            setIsExportModalOpen(false);
            setIsLoading(true);
            const doc = new jsPDF('landscape');
            doc.text(`${sheetData?.name || 'Spreadsheet'} - Export`, 14, 15);

            const EXCLUDED_TYPES = ['comment', 'pdf'];
            const colsToExport = columns.filter(c => exportSelectedColumns[c.id] && !EXCLUDED_TYPES.includes(c.type));
            const tableCols = colsToExport.map(c => ({ header: c.name, dataKey: c.id }));

            const tableData = [];
            const imagesToDraw = {};
            const rowBackgrounds = {}; // To store computed row colors for PDF

            const fetchImageAndDimensions = async (url) => {
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const base64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                    const dimensions = await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                        img.onerror = () => resolve({ width: 1, height: 1 });
                        img.src = base64;
                    });
                    return { base64, ...dimensions };
                } catch (e) {
                    console.error("Failed to load image", e);
                    return null;
                }
            };

            const hexToRgb = (hex) => {
                if (!hex || hex === 'transparent') return null;
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? [
                    parseInt(result[1], 16),
                    parseInt(result[2], 16),
                    parseInt(result[3], 16)
                ] : null;
            };

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowData = {};

                // Determine row background color (same logic as grid rendering)
                let computedRowBg = row.rowColor || null;
                const sourceCol = columns.find(c => {
                    const opts = parseOptions(c.options);
                    return opts.isRowColorSource && c.bgColor;
                });
                if (sourceCol) {
                    const sourceCell = row.cells?.find(c => c.columnId === sourceCol.id);
                    const val = sourceCell?.computedValue ?? sourceCell?.rawValue;
                    if (val !== null && val !== undefined && val !== '') {
                        computedRowBg = sourceCol.bgColor;
                    }
                }
                rowBackgrounds[i] = computedRowBg;

                for (const col of colsToExport) {
                    const cell = row.cells?.find(c => c.columnId === col.id);
                    let val = cell?.computedValue ?? cell?.rawValue ?? '';

                    // Strip emojis because jsPDF standard fonts cannot render them and produce garbled text
                    if (typeof val === 'string') {
                        val = val.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
                    }

                    if (col.type === 'currency' && val !== '') {
                        val = cell?.formattedValue || formatCurrency(val, col.currencyCode);
                        val = val.replace('₹', 'Rs.');
                    } else if (col.type === 'date') {
                        if (val) {
                            const d = new Date(val + 'T00:00:00');
                            val = isNaN(d.getTime()) ? val : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        } else {
                            val = 'dd-mm-yyyy';
                        }
                    } else if (col.type === 'time') {
                        if (val) {
                            const parts = val.split(':');
                            const h = parseInt(parts[0], 10);
                            if (!isNaN(h) && parts.length >= 2) {
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                const h12 = h % 12 || 12;
                                val = `${h12}:${parts[1]} ${ampm}`;
                            }
                        } else {
                            val = '--:-- --';
                        }
                    } else if (col.type === 'comment') {
                        const count = cell?.id ? (commentCounts[cell.id] || 0) : 0;
                        val = count > 0 ? `${count} comment${count > 1 ? 's' : ''}` : (col.permission === 'view' ? '' : 'Tap to add comments.');
                    } else if (col.type === 'multi_image' && val) {
                        try {
                            const imgs = JSON.parse(val);
                            if (Array.isArray(imgs) && imgs.length > 0) {
                                const imgDataArray = [];
                                for (const img of imgs) {
                                    let imgUrl = img.url;
                                    if (!imgUrl.startsWith('http')) {
                                        imgUrl = getMediaUrl(imgUrl);
                                    }
                                    const imgData = await fetchImageAndDimensions(imgUrl);
                                    if (imgData && imgData.base64) {
                                        imgDataArray.push(imgData);
                                    }
                                }
                                if (imgDataArray.length > 0) {
                                    imagesToDraw[`${i}_${col.id}`] = imgDataArray;
                                    // Reserve fixed vertical space for images (single row height)
                                    val = '\n\n\n\n\n\n\n';
                                } else {
                                    val = '';
                                }
                            } else {
                                val = '';
                            }
                        } catch {
                            val = '';
                        }
                    }

                    rowData[col.id] = val;
                }
                tableData.push(rowData);
            }

            // Build calc footer row for autoTable foot (proper per-column alignment)
            const hasCalc = colsToExport.some(col => columnCalcMode[col.id]);
            const footRow = colsToExport.map(col => {
                if (columnCalcMode[col.id]) {
                    const mode = columnCalcMode[col.id];
                    let val = getColumnCalcValue(col.id, mode);
                    // Replace ₹ with Rs. — jsPDF built-in fonts cannot render ₹
                    if (typeof val === 'string') val = val.replace(/₹/g, 'Rs.');
                    else if (typeof val === 'number') val = String(val);
                    const label = mode === 'total' ? 'Total' : 'Avg';
                    const isNumericType = col.type === 'number' || col.type === 'currency' || col.type === 'formula';
                    return {
                        content: `${label}:\n${val}`,
                        styles: {
                            halign: isNumericType ? 'right' : 'left',
                            cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
                            overflow: 'linebreak',
                            fontSize: 7,
                        }
                    };
                }
                return { content: '' };
            });

            autoTable(doc, {
                startY: 20,
                theme: 'grid',
                tableWidth: 'wrap',
                columns: tableCols,
                body: tableData,
                foot: hasCalc ? [footRow] : [],
                showFoot: hasCalc ? 'lastPage' : 'never',
                styles: {
                    fontSize: 8,
                    cellPadding: 1.5,
                    valign: 'middle',
                    lineColor: [180, 180, 180],
                    lineWidth: 0.1,
                    textColor: [51, 65, 85],
                    overflow: 'linebreak',
                },
                headStyles: {
                    fillColor: [51, 65, 85],
                    textColor: 255,
                    lineColor: [51, 65, 85],
                    lineWidth: 0.1,
                    fontStyle: 'bold'
                },
                footStyles: {
                    fillColor: [230, 235, 245],
                    textColor: [30, 41, 59],
                    fontStyle: 'bold',
                    fontSize: 8,
                    lineColor: [150, 150, 180],
                    lineWidth: 0.2,
                },
                columnStyles: colsToExport.reduce((acc, col) => {
                    if (col.type === 'multi_image') acc[col.id] = { minCellWidth: 50 };
                    if (col.type === 'number' || col.type === 'currency' || col.type === 'formula') {
                        acc[col.id] = { ...acc[col.id], halign: 'right' };
                    }
                    return acc;
                }, {}),
                didParseCell: (data) => {
                    if (data.section === 'body') {
                        const colId = data.column.dataKey;
                        const colDef = colsToExport.find(c => c.id === colId);
                        const rowIndex = data.row.index;

                        // Background color priority: Column Color > Row Color
                        const bgColorHex = colDef?.bgColor || rowBackgrounds[rowIndex];
                        const rgb = hexToRgb(bgColorHex);
                        if (rgb) {
                            data.cell.styles.fillColor = rgb;
                        }

                    }
                },
                didDrawCell: (data) => {
                    if (data.section === 'body') {
                        const imgDataArray = imagesToDraw[`${data.row.index}_${data.column.dataKey}`];
                        if (imgDataArray && Array.isArray(imgDataArray) && imgDataArray.length > 0) {
                            const cellWidth = data.cell.width;
                            const cellHeight = data.cell.height;
                            const count = imgDataArray.length;
                            const padding = 2;

                            // Divide cell width equally among all images, side by side
                            const slotWidth = (cellWidth - padding * (count + 1)) / count;
                            const maxImgHeight = cellHeight - padding * 2;

                            imgDataArray.forEach((imgData, index) => {
                                const imgAspect = imgData.width / imgData.height;

                                // Fit image within its slot, preserving aspect ratio
                                let finalImgWidth = slotWidth;
                                let finalImgHeight = slotWidth / imgAspect;
                                if (finalImgHeight > maxImgHeight) {
                                    finalImgHeight = maxImgHeight;
                                    finalImgWidth = maxImgHeight * imgAspect;
                                }

                                // Center image horizontally within its slot
                                const slotX = data.cell.x + padding + index * (slotWidth + padding);
                                const x = slotX + (slotWidth - finalImgWidth) / 2;
                                // Center image vertically within cell
                                const y = data.cell.y + (cellHeight - finalImgHeight) / 2;

                                try {
                                    doc.addImage(imgData.base64, 'JPEG', x, y, finalImgWidth, finalImgHeight);
                                } catch {
                                    try { doc.addImage(imgData.base64, 'PNG', x, y, finalImgWidth, finalImgHeight); } catch { }
                                }
                            });
                        }
                    }
                }
            });

            doc.save(`${sheetData?.name || 'spreadsheet'}.pdf`);
        } catch (error) {
            console.error("PDF Export failed:", error);
            alert("Failed to export PDF.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExportPDF = () => {
        const EXCLUDED_TYPES = ['comment', 'pdf'];
        const initialMap = {};
        columns.forEach(c => { initialMap[c.id] = !EXCLUDED_TYPES.includes(c.type); });
        setExportSelectedColumns(initialMap);
        setIsExportModalOpen(true);
    };

    const renderColumnIcon = (type) => {
        switch (type) {
            case 'image':
            case 'multi_image':
                return <FiImage className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
            case 'number': return <span className="text-green-500 text-sm font-medium shrink-0">123</span>;
            case 'currency': return <span className="text-blue-400 text-sm shrink-0">₹</span>;
            case 'formula': return <span className="text-purple-400 text-sm italic font-serif shrink-0">fx</span>;
            case 'date': return <FiCalendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
            case 'pdf': return <FiFileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />;

            case 'comment': return <FiMessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
            case 'text':
            default: return <span className="text-blue-400 font-serif text-sm shrink-0">T</span>;
        }
    };

    return (
        <div className={`flex flex-col bg-white overflow-hidden w-full ${isNested ? 'h-full border border-gray-200 rounded-lg shadow-sm' : 'h-screen'}`}>
            {accessError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50">
                    <FiAlertCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                    <p className="text-gray-600">You don't have permission to view this {isNested ? 'cell detail' : 'spreadsheet'}.</p>
                </div>
            ) : (
            <>
            {/* Sub-Sheet simplified header */}
            {isNested && (
                <div className="bg-white border-b border-gray-100 flex items-center justify-between px-6 py-4 shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FiColumns className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 group">
                                <h3 className="text-xl font-bold text-gray-800">
                                    {sheetData?.name || "Row Detail Sub-Sheet"}
                                </h3>
                                {(sheetData?.userPermission === 'admin' || sheetData?.userPermission === 'editor') && (
                                    <button
                                        onClick={() => {
                                            setRenamingSubSheetId(docName);
                                            setRenamingSubSheetName(sheetData?.name || "");
                                            setShowRenameSubSheetModal(true);
                                        }}
                                        className="p-1.5 bg-blue-500 text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
                                        title="Rename Sub-Sheet"
                                    >
                                        <FiEdit2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">Sub-Spreadsheet View</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-[1px] bg-gray-100 mx-2"></div>
                        {/* Search is handled in the shared toolbar below */}
                    </div>
                </div>
            )}

            {/* Top Navigation */}
            {!isNested && (
                <div className="bg-[#0f172a] text-white flex items-center justify-between px-4 py-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setActivePath(returnPath || '/my-files')}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
                            title="Back"
                        >
                            <FiArrowLeft className="w-5 h-5 text-gray-300" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-white shadow-sm">
                                <span className="text-xl leading-none -mt-0.5">D</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="font-semibold text-lg">{sheetData?.name || "Loading..."}</h1>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {!isNested && (
                            <button
                                onClick={handleExportPDF}
                                className="sm:hidden flex items-center justify-center p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                                title="Download PDF"
                            >
                                <FiDownload className="w-4 h-4 text-white" />
                            </button>
                        )}
                        {(sheetData?.userPermission === 'admin') && (
                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors"
                            >
                                <FiShare2 className="w-4 h-4" />
                                <span className="hidden sm:block">Share</span>
                            </button>
                        )}
                        {/* <button
                        onClick={handleDownloadBackup}
                        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors"
                        title="Download JSON Backup"
                    >
                        <FiDownload className="w-4 h-4" />
                        <span className="hidden sm:block">Backup</span>
                    </button> */}

                        {/* User profile placeholder removed as it was static */}
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-end gap-3 px-3 py-2 border-b border-gray-200 bg-white shrink-0">
                {!isNested && (
                    <button
                        onClick={handleExportPDF}
                        className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full text-sm font-medium transition-colors border border-blue-200"
                    >
                        <FiDownload className="w-4 h-4" />
                        Download PDF
                    </button>
                )}

                {/* Sort Button + Panel */}
                <div className="relative" ref={sortPanelRef}>
                    <button
                        id="toolbar-sort-button"
                        onClick={() => {
                            setPendingSortConfig({ colId: sortConfig.colId || '', direction: sortConfig.direction });
                            setIsSortPanelOpen(prev => !prev);
                        }}
                        className={`hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${sortConfig.colId
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                    >
                        {sortConfig.colId
                            ? (sortConfig.direction === 'asc' ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />)
                            : <BsSortAlphaDown className="w-4 h-4" />}
                        Sort
                        {sortConfig.colId && (
                            <span className="text-[10px] font-semibold bg-indigo-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                                {columns.find(c => c.id === sortConfig.colId)?.name?.slice(0, 8) || ''}
                            </span>
                        )}
                    </button>

                    {isSortPanelOpen && (
                        <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-150 z-50 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Sort Rows</p>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Column Picker */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Sort by column</label>
                                    <select
                                        id="sort-column-picker"
                                        value={pendingSortConfig.colId}
                                        onChange={(e) => setPendingSortConfig(prev => ({ ...prev, colId: e.target.value }))}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700"
                                    >
                                        <option value="">— Select a column —</option>
                                        {columns
                                            .filter(c => !['multi_image', 'pdf', 'comment'].includes(c.type))
                                            .map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                    </select>
                                </div>

                                {/* Direction Toggle */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Order</label>
                                    <div className="flex gap-2">
                                        <button
                                            id="sort-dir-asc"
                                            onClick={() => setPendingSortConfig(prev => ({ ...prev, direction: 'asc' }))}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${pendingSortConfig.direction === 'asc'
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <FiArrowUp className="w-4 h-4" />
                                            A → Z / 1 → 9
                                        </button>
                                        <button
                                            id="sort-dir-desc"
                                            onClick={() => setPendingSortConfig(prev => ({ ...prev, direction: 'desc' }))}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${pendingSortConfig.direction === 'desc'
                                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}
                                        >
                                            <FiArrowDown className="w-4 h-4" />
                                            Z → A / 9 → 1
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="px-4 pb-4 flex gap-2">
                                <button
                                    id="sort-apply-btn"
                                    disabled={!pendingSortConfig.colId}
                                    onClick={() => {
                                        if (!pendingSortConfig.colId) return;
                                        const next = { colId: pendingSortConfig.colId, direction: pendingSortConfig.direction };
                                        setSortConfig(next);
                                        apiClient.patch(`/sheets/${docName}/sort`, { sortConfig: next })
                                            .catch(err => console.error('Error persisting sort:', err));
                                        setIsSortPanelOpen(false);
                                    }}
                                    className="flex-1 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Apply Sort
                                </button>
                                {sortConfig.colId && (
                                    <button
                                        id="sort-clear-btn"
                                        onClick={() => {
                                            const cleared = { colId: null, direction: 'asc' };
                                            setSortConfig(cleared);
                                            setPendingSortConfig({ colId: '', direction: 'asc' });
                                            apiClient.patch(`/sheets/${docName}/sort`, { sortConfig: cleared })
                                                .catch(err => console.error('Error clearing sort:', err));
                                            setIsSortPanelOpen(false);
                                        }}
                                        className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-red-500 transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="relative w-72">
                    <input
                        type="text"
                        placeholder="search values..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-4 pr-10 py-1.5 bg-white border border-blue-400 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full text-gray-700 placeholder:text-gray-400"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:bg-blue-600 transition-colors">
                        <FiSearch className="w-3.5 h-3.5 text-white" />
                    </div>
                </div>
            </div>

            {/* Spreadsheet Area */}
            <div className="flex-1 overflow-auto bg-gray-50 relative w-full">
                <table className="w-max text-left border-collapse bg-white table-fixed relative">
                    <thead>
                        <tr className="bg-white sticky top-0 z-20 shadow-[0_1px_0_#9ca3af]">
                            <th className="w-12 min-w-12 border-b border-r border-gray-400 text-center py-2 text-gray-400 font-normal sticky left-0 bg-white z-30"></th>
                            {columns.map(col => (
                                <th
                                    key={col.id}
                                    className={`border-b border-r border-gray-400 py-2 px-3 text-xs font-bold transition-colors relative group select-none ${resizingCol === col.id ? 'bg-blue-50/20' : (!col.bgColor ? 'bg-white hover:bg-gray-50 text-gray-800' : 'text-gray-800')}`}
                                    style={{ width: col.width || 220, minWidth: col.width || 220, backgroundColor: col.bgColor || undefined }}
                                >
                                    {/* Resize handle */}
                                    <div
                                        onMouseDown={(e) => handleColResizeStart(e, col)}
                                        onTouchStart={(e) => handleColResizeStart(e, col)}
                                        className="absolute top-0 right-0 h-full w-5 -mr-0.5 cursor-col-resize z-30 group/resize flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="w-1 h-full bg-blue-500/0 group-hover/resize:bg-blue-500/40 transition-all relative">
                                            {/* Center grabber pill */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-500 opacity-0 group-hover/resize:opacity-100 rounded-full shadow-sm transition-opacity" />
                                        </div>
                                    </div>
                                    <div
                                        className="flex items-center justify-between"
                                        onClick={(e) => {
                                            if (col.permission !== 'view') {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setActiveColumnMenu(activeColumnMenu?.id === col.id ? null : {
                                                    id: col.id,
                                                    x: rect.left,
                                                    y: rect.bottom
                                                });
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden flex-1 lg:opacity-80 lg:group-hover:opacity-100 opacity-100 transition-opacity">
                                            {renderColumnIcon(col.type)}
                                            <span className={`whitespace-pre-wrap break-all font-bold transition-colors ${col.permission !== 'view' ? 'group-hover:text-blue-600 cursor-pointer' : 'cursor-default'}`}>{col.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {col.permission !== 'view' && (
                                                <FiChevronDown className={`w-3.5 h-3.5 shrink-0 cursor-pointer transition-transform ${activeColumnMenu?.id === col.id ? 'text-blue-600 rotate-180 opacity-100' : 'text-gray-400 hover:text-gray-600 lg:opacity-0 lg:group-hover:opacity-100 opacity-100'}`} />
                                            )}
                                        </div>
                                    </div>

                                    {/* Column Menu Dropdown moved to bottom of component for fixed positioning */}
                                </th>
                            ))}
                            {(sheetData?.userPermission === 'admin' || sheetData?.userPermission === 'editor') && (
                                <th className="w-12 min-w-12 border border-blue-900 bg-[#3b415a] hover:bg-[#2d3144] transition-colors p-0 sticky right-0 z-40 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">
                                    <button
                                        onClick={handleAddColumnClick}
                                        className="w-full h-full flex items-center justify-center text-white p-2"
                                    >
                                        <FiPlus className="w-5 h-5" />
                                    </button>
                                </th>
                            )}
                        </tr>
                        {/* Filter Row — shown when any column has an active filter */}
                        {Object.keys(columnFilters).length > 0 && (
                            <tr className="bg-blue-50/50 sticky top-[41px] z-20">
                                <th className="w-12 min-w-12 border border-gray-300 bg-blue-50/50 sticky left-0 z-30 text-center">
                                    <FiFilter className="w-3 h-3 text-blue-400 mx-auto" />
                                </th>
                                {columns.map(col => (
                                    <th key={`filter-${col.id}`} className="border border-gray-300 p-1 bg-blue-50/50" style={{ width: col.width || 220, minWidth: col.width || 220 }}>
                                        {col.id in columnFilters ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="text"
                                                    value={columnFilters[col.id] || ''}
                                                    onChange={(e) => setColumnFilters(prev => ({ ...prev, [col.id]: e.target.value }))}
                                                    placeholder={`Filter ${col.name}...`}
                                                    className="w-full px-2 py-1 text-xs border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => setColumnFilters(prev => { const u = { ...prev }; delete u[col.id]; return u; })}
                                                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                                >
                                                    <FiX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : null}
                                    </th>
                                ))}
                                <th className="w-8 min-w-8 border-b border-gray-300 bg-[#334155] sticky right-0 z-30 relative group cursor-pointer hover:bg-[#1e293b] transition-colors" onClick={() => setIsColumnModalOpen(true)}>
                                    <div className="absolute inset-0 flex items-center justify-center p-0.5 text-white">
                                        <FiPlus className="w-4 h-4" />
                                    </div>
                                </th>
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length + 2} className="text-center py-20 text-gray-500">
                                    <div className="flex justify-center items-center h-full">
                                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            sortedRows.map((row, index) => {
                                // Determine row background color
                                let computedRowBg = row.rowColor || 'transparent';
                                const sourceCol = columns.find(c => {
                                    const opts = parseOptions(c.options);
                                    return opts.isRowColorSource && c.bgColor;
                                });
                                if (sourceCol) {
                                    const sourceCell = row.cells?.find(c => c.columnId === sourceCol.id);
                                    const val = sourceCell?.computedValue ?? sourceCell?.rawValue;
                                    if (val !== null && val !== undefined && val !== '') {
                                        computedRowBg = sourceCol.bgColor;
                                    }
                                }

                                return (
                                    <tr
                                        key={row.id || index}
                                        className="hover:bg-blue-50/10 transition-colors group text-[#334155]"
                                        style={{ backgroundColor: computedRowBg }}
                                    >
                                        <td
                                            className={`relative border-b border-r border-gray-400 text-center py-2 text-[13px] text-gray-500 group-hover:bg-gray-100/50 transition-colors w-12 sticky left-0 z-10 min-w-12 font-medium ${computedRowBg === 'transparent' ? 'bg-gray-50/50' : ''} ${activeRowMenu?.rowIndex === index ? 'bg-blue-100' : ''}`}
                                            onContextMenu={(e) => handleRowContextMenu(e, index)}
                                            onClick={(e) => handleRowContextMenu(e, index)}
                                        >
                                            <span className="cursor-pointer">{index + 1}</span>
                                        </td>
                                        {columns.map((col) => {
                                            const cell = row.cells?.find(c => c.columnId === col.id);
                                            const isFormula = col.type === 'formula';
                                            const val = isFormula
                                                ? (cell?.computedValue ?? '')
                                                : (cell?.computedValue ?? cell?.rawValue ?? '');

                                            const isFocused = focusedCell?.rowId === row.id && focusedCell?.colId === col.id;
                                            let displayVal = val;
                                            if (col.type === 'currency' && val !== '') {
                                                displayVal = isFocused ? val : (cell?.formattedValue || formatCurrency(val, col.currencyCode));
                                            } else if (col.type === 'date' && val) {
                                                const d = new Date(val + 'T00:00:00');
                                                displayVal = isFocused
                                                    ? val
                                                    : (isNaN(d.getTime()) ? val : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }));
                                            } else if (col.type === 'time' && val) {
                                                // Show formatted "H:MM AM/PM" when not focused
                                                if (!isFocused) {
                                                    const parts = val.split(':');
                                                    const h = parseInt(parts[0], 10);
                                                    if (!isNaN(h) && parts.length >= 2) {
                                                        const ampm = h >= 12 ? 'PM' : 'AM';
                                                        const h12 = h % 12 || 12;
                                                        displayVal = `${h12}:${parts[1]} ${ampm}`;
                                                    }
                                                }
                                            }

                                            const cellCommentCount = cell?.id ? (commentCounts[cell.id] || 0) : 0;

                                            return (
                                                <td
                                                    key={col.id}
                                                    className={`border-b border-r border-gray-400 p-0 relative min-h-9 h-auto ${resizingCol === col.id ? 'bg-blue-50/10' : ''} ${activeCellMenu?.rowIndex === index && activeCellMenu?.colId === col.id ? 'ring-2 ring-blue-500 z-10 bg-blue-50/10' : ''}`}
                                                    style={{
                                                        width: col.width || 220,
                                                        minWidth: col.width || 220,
                                                        backgroundColor: cell?.bgColor || col.bgColor || computedRowBg || 'transparent'
                                                    }}
                                                    onContextMenu={(e) => handleCellContextMenu(e, index, col.id)}
                                                >
                                                    {/* Comment Indicator Triangle */}
                                                    {cellCommentCount > 0 && (
                                                        <div
                                                            className="absolute top-0 right-0 z-20 cursor-pointer"
                                                            onClick={(e) => { e.stopPropagation(); openCommentPanel(cell.id, row.id, col.id); }}
                                                            onMouseEnter={() => handleCommentHover(cell.id)}
                                                            onMouseLeave={() => { setHoveredCommentCell(null); setLatestCommentPreview(null); }}
                                                            title={`${cellCommentCount} comment${cellCommentCount > 1 ? 's' : ''}`}
                                                        >
                                                            <div style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderTop: '8px solid #3b82f6' }} />
                                                            {/* Tooltip preview */}
                                                            {hoveredCommentCell === cell.id && latestCommentPreview?.cellId === cell.id && (
                                                                <div className="absolute top-2 right-2 w-48 bg-gray-800 text-white text-xs rounded-lg p-2 shadow-lg z-50 pointer-events-none">
                                                                    <div className="font-semibold text-blue-300 mb-0.5">{latestCommentPreview.author}</div>
                                                                    <div className="line-clamp-2 opacity-90">{latestCommentPreview.text}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Cell Sub-Sheet Indicator */}
                                                    {(nestedSheetsMapping[`${row.id}_${col.id}`] || parseOptions(col.options).isDetailedViewEnabled) && (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenOrCreateDetails(row, col);
                                                            }}
                                                            className="absolute bottom-0 right-0 z-20 cursor-pointer p-1 bg-blue-500 rounded-tl-md shadow-sm"
                                                            title="Open Details"
                                                        >
                                                            <FiColumns className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    )}
                                                    {col.type === 'currency' && isFocused && (
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm select-none pointer-events-none z-20">
                                                            {getCurrencySymbol(col.currencyCode)}
                                                        </div>
                                                    )}
                                                    {col.type === 'comment' ? (
                                                        <div
                                                            className="w-full min-h-9 flex items-center px-2 cursor-pointer hover:bg-blue-50/30 transition-colors"
                                                            onClick={() => openCommentPanel(cell?.id, row.id, col.id, cell?.permission)}
                                                        >
                                                            {cellCommentCount > 0 ? (
                                                                <div className="flex items-center gap-2 overflow-hidden w-full">
                                                                    <div className="w-6 h-6 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                                        {cellCommentCount}
                                                                    </div>
                                                                    <span className="text-xs text-gray-600 whitespace-pre-wrap wrap-break-word py-1.5">
                                                                        {cellCommentCount === 1 ? '1 comment' : `${cellCommentCount} comments`}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 italic">
                                                                    {cell?.permission === 'view' ? '' : 'Tap to add comments.'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : col.type === 'multi_image' ? (
                                                        <div
                                                            className="w-full min-h-9 flex items-center px-3 py-1 cursor-pointer hover:bg-black/5"
                                                            onClick={() => handleImageGalleryOpen(row.id, col.id, displayVal, cell?.permission)}
                                                        >
                                                            {(() => {
                                                                try {
                                                                    const imgs = JSON.parse(displayVal || '[]');
                                                                    if (!Array.isArray(imgs) || imgs.length === 0) {
                                                                        return <span className="text-gray-400 text-xs italic">No Images</span>;
                                                                    }
                                                                    return (
                                                                        <div className="relative inline-flex mt-px">
                                                                            <img
                                                                                src={getMediaUrl(imgs[0].url)}
                                                                                alt="img"
                                                                                className="h-8 w-14 object-cover bg-white rounded border border-gray-200 shrink-0 shadow-sm"
                                                                            />
                                                                            {imgs.length > 1 && (
                                                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#374151] text-white flex items-center justify-center text-[9px] font-bold shadow-sm border border-white">
                                                                                    {imgs.length}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } catch {
                                                                    return <span className="text-red-400 text-xs">Invalid format</span>;
                                                                }
                                                            })()}
                                                        </div>
                                                    ) : col.type === 'pdf' ? (
                                                        <div
                                                            className="w-full min-h-9 flex items-center px-3 py-1 cursor-pointer hover:bg-black/5"
                                                            onClick={() => handlePDFGalleryOpen(row.id, col.id, displayVal, cell?.permission)}
                                                         >
                                                            {(() => {
                                                                try {
                                                                    const docs = JSON.parse(displayVal || '[]');
                                                                    if (!Array.isArray(docs) || docs.length === 0) {
                                                                        return <span className="text-gray-400 text-xs italic">No PDFs</span>;
                                                                    }
                                                                    return (
                                                                        <div className="flex items-center gap-2 overflow-hidden w-full py-1">
                                                                            <div className="relative shrink-0">
                                                                                <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
                                                                                    <FiFileText className="text-red-500 w-4.5 h-4.5" />
                                                                                </div>
                                                                                {docs.length > 0 && (
                                                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] font-bold shadow-sm border border-white">
                                                                                        {docs.length}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <span className="text-xs text-gray-600 whitespace-pre-wrap wrap-break-word font-medium flex-1">
                                                                                {docs[0].fileName}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                } catch {
                                                                    return <span className="text-red-400 text-xs">Invalid format</span>;
                                                                }
                                                            })()}
                                                        </div>
                                                    ) : col.type === 'date' ? (
                                                        <div className="min-h-9 flex items-center w-full relative">
                                                            <input
                                                                type="date"
                                                                key={`date-${row.id}-${col.id}-${val}`}
                                                                defaultValue={val || ''}
                                                                onFocus={() => setFocusedCell({ rowId: row.id, colId: col.id })}
                                                                onBlur={(e) => {
                                                                    setFocusedCell(null);
                                                                    if (e.target.value !== val) {
                                                                        handleCellChange(row.id, col.id, e.target.value);
                                                                    }
                                                                }}
                                                                readOnly={cell?.permission === 'view'}
                                                                className={`w-full pl-3 ${(nestedSheetsMapping[`${row.id}_${col.id}`] || parseOptions(col.options).isDetailedViewEnabled) ? 'pr-7' : 'pr-3'} py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:z-10 bg-transparent text-[13px] text-gray-800 ${cell?.permission === 'view' ? 'cursor-default' : 'cursor-text'} ${getCellFormattingClasses(cell, row, col)}`}
                                                            />
                                                        </div>
                                                    ) : col.type === 'time' ? (
                                                        <div className="min-h-9 flex items-center w-full relative">
                                                            {isFocused ? (
                                                                /* When focused: native time picker for editing */
                                                                <input
                                                                    type="time"
                                                                    autoFocus
                                                                    defaultValue={val || ''}
                                                                    onBlur={(e) => {
                                                                        setFocusedCell(null);
                                                                        if (e.target.value !== val) {
                                                                            handleCellChange(row.id, col.id, e.target.value);
                                                                        }
                                                                    }}
                                                                    readOnly={cell?.permission === 'view'}
                                                                    className={`w-full pl-3 pr-3 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 focus:z-10 bg-transparent text-[13px] text-gray-800 ${cell?.permission === 'view' ? 'cursor-default' : 'cursor-text'} ${getCellFormattingClasses(cell, row, col)}`}
                                                                />
                                                            ) : (
                                                                /* When not focused: show formatted time as text, click to edit */
                                                                <div
                                                                    onClick={() => {
                                                                        if (cell?.permission !== 'view') {
                                                                            // Auto-fill system time if empty, then focus
                                                                            if (!val) {
                                                                                const now = new Date();
                                                                                const hh = String(now.getHours()).padStart(2, '0');
                                                                                const mm = String(now.getMinutes()).padStart(2, '0');
                                                                                handleCellChange(row.id, col.id, `${hh}:${mm}`);
                                                                            }
                                                                            setFocusedCell({ rowId: row.id, colId: col.id });
                                                                        }
                                                                    }}
                                                                    className={`w-full pl-3 pr-3 py-1.5 min-h-9 flex items-center text-[13px] text-gray-800 ${cell?.permission === 'view' ? 'cursor-default' : 'cursor-pointer'} ${getCellFormattingClasses(cell, row, col)}`}
                                                                >
                                                                    {displayVal || <span className="text-gray-300 text-xs">--:-- --</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="grid w-full min-w-0 relative group/textcell">
                                                            {/* Ghost div to expand height */}
                                                            <div className={`invisible pl-3 ${(nestedSheetsMapping[`${row.id}_${col.id}`] || parseOptions(col.options).isDetailedViewEnabled) ? 'pr-7' : 'pr-3'} py-2 text-[13px] whitespace-pre-wrap break-all w-full min-w-0 min-h-9 ${getCellFormattingClasses(cell, row, col, isFormula)}`}>
                                                                {displayVal || ' '}
                                                            </div>
                                                            <textarea
                                                                key={`text-${row.id}-${col.id}-${displayVal}`}
                                                                ref={el => { emojiTextareaRefs.current[`${row.id}_${col.id}`] = el; }}
                                                                defaultValue={displayVal}
                                                                placeholder={col.type === 'number' || col.type === 'currency' ? '0' : ''}
                                                                onFocus={() => setFocusedCell({ rowId: row.id, colId: col.id })}
                                                                onChange={(e) => {
                                                                    if (col.type === 'number') {
                                                                        let val = e.target.value.replace(/[^0-9.-]/g, '');
                                                                        const parts = val.split('.');
                                                                        if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                                                                        if (val.lastIndexOf('-') > 0) val = val[0] + val.slice(1).replace(/-/g, '');
                                                                        e.target.value = val;
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    setFocusedCell(null);
                                                                    if (!isFormula) {
                                                                        let newVal = e.target.value;
                                                                        if ((col.type === 'number' || col.type === 'currency') && newVal.trim() === '') {
                                                                            newVal = '0';
                                                                        }
                                                                        if (newVal !== displayVal) {
                                                                            handleCellChange(row.id, col.id, newVal);
                                                                        }
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Escape' || e.key === 'Enter') {
                                                                        e.preventDefault();
                                                                        e.currentTarget.blur();
                                                                    }
                                                                }}
                                                                readOnly={cell?.permission === 'view' || isFormula}
                                                                rows={1}
                                                                className={`absolute inset-0 w-full h-full min-w-0 pl-3 ${(nestedSheetsMapping[`${row.id}_${col.id}`] || parseOptions(col.options).isDetailedViewEnabled) ? 'pr-14' : 'pr-8'} py-2 outline-none focus:ring-1 focus:ring-blue-500 focus:z-10 bg-transparent text-[13px] text-gray-800 resize-none overflow-hidden whitespace-pre-wrap break-all ${col.type === 'currency' && isFocused ? 'pl-8' : ''} ${cell?.permission === 'view' || isFormula ? 'cursor-default bg-gray-50/30' : 'cursor-text'} ${col.type === 'number' || col.type === 'currency' || isFormula ? 'text-right' : ''} ${getCellFormattingClasses(cell, row, col, isFormula)}`}
                                                            />
                                                            {/* Emoji button — only on text columns, not view-only */}
                                                            {col.type === 'text' && cell?.permission !== 'view' && (
                                                                <div className={`absolute ${(nestedSheetsMapping[`${row.id}_${col.id}`] || parseOptions(col.options).isDetailedViewEnabled) ? 'right-6' : 'right-1'} top-1/2 -translate-y-1/2 z-20`}>
                                                                    <button
                                                                        type="button"
                                                                        onMouseDown={e => {
                                                                            e.preventDefault();
                                                                            if (emojiPickerCell?.rowId === row.id && emojiPickerCell?.colId === col.id) {
                                                                                setEmojiPickerCell(null);
                                                                            } else {
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                setEmojiPickerCell({
                                                                                    rowId: row.id,
                                                                                    colId: col.id,
                                                                                    x: rect.right,
                                                                                    y: rect.bottom
                                                                                });
                                                                            }
                                                                        }}
                                                                        className="opacity-0 group-hover/textcell:opacity-100 focus-within:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-all text-sm"
                                                                        title="Insert emoji"
                                                                    >😊</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="border-b border-gray-200 w-12 sticky right-0 z-10 min-w-12"></td>
                                    </tr>
                                );
                            })
                        )}
                        {(sheetData?.userPermission === 'admin' || sheetData?.userPermission === 'editor') && (
                            <tr className="h-10 hover:bg-gray-50 transition-colors">
                                <td className="w-12 border-b border-gray-200 bg-gray-50 sticky left-0 z-10"></td>
                                <td colSpan={columns.length + 1} className="border-b border-gray-200 p-0">
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {/* Bottom Calculation Bar */}
                    <tfoot className="sticky bottom-0 z-30 bg-[#f8fafc] shadow-[0_-1px_0_#9ca3af,0_1px_0_#9ca3af]">
                        <tr className="h-10">
                            <td
                                onClick={handleAddRow}
                                className="w-12 min-w-12 border-r border-gray-400 bg-[#475569] hover:bg-[#334155] transition-colors p-0 sticky left-0 z-30 cursor-pointer"
                                title="Add Row"
                            >
                                <div className="flex items-center justify-center w-full h-full">
                                    <FiPlus className="w-4 h-4 text-white" />
                                </div>
                            </td>
                            {columns.map((col) => {
                                const mode = columnCalcMode[col.id];
                                const calcValue = mode ? getColumnCalcValue(col.id, mode) : null;
                                const isNonCalcType = col.type === 'text' || col.type === 'multi_image' || col.type === 'comment' || col.type === 'image' || col.type === 'pdf' || col.type === 'date' || col.type === 'time';

                                return (
                                    <td
                                        key={col.id}
                                        className={`border-r border-gray-400 bg-[#f8fafc] relative p-0 ${resizingCol === col.id ? 'bg-blue-50/20' : ''}`}
                                    >
                                        {isNonCalcType ? null : mode ? (
                                            /* Show calculated value */
                                            <div className="flex items-center justify-between h-full px-3 py-1.5 min-h-[40px]">
                                                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                                    {mode === 'total' ? 'Total' : 'Avg'}:
                                                </span>
                                                <span className="text-sm font-semibold text-gray-800 ml-1">{calcValue}</span>
                                                <button
                                                    onClick={() => setColumnCalcMode(prev => ({ ...prev, [col.id]: null }))}
                                                    className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                                                    title="Clear"
                                                >
                                                    <FiX className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative h-full flex items-center min-h-[40px]">
                                                <button
                                                    onClick={() => setActiveCalcDropdown(activeCalcDropdown === col.id ? null : col.id)}
                                                    className="flex items-center gap-1.5 w-full h-full px-3 text-sm text-[#475569] hover:text-[#3b82f6] hover:bg-blue-50/30 transition-colors outline-none whitespace-nowrap"
                                                >
                                                    <span className="font-normal">Calculate</span>
                                                    <FiChevronDown className={`w-3 h-3 transition-transform shrink-0 ${activeCalcDropdown === col.id ? 'rotate-180' : ''}`} />
                                                </button>

                                                {activeCalcDropdown === col.id && (
                                                    <div className="absolute bottom-full left-0 mb-1 w-36 bg-white rounded shadow-lg border border-gray-200 py-1 z-50">
                                                        <button
                                                            onClick={() => {
                                                                setColumnCalcMode(prev => ({ ...prev, [col.id]: 'total' }));
                                                                setActiveCalcDropdown(null);
                                                            }}
                                                            className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                                                        >
                                                            Show Total
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setColumnCalcMode(prev => ({ ...prev, [col.id]: 'average' }));
                                                                setActiveCalcDropdown(null);
                                                            }}
                                                            className="w-full text-left px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                                                        >
                                                            Show Average
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                            <td className="w-12 min-w-12 bg-[#f8fafc] sticky right-0 z-10 border-l border-gray-200"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Global Emoji Picker */}
            {emojiPickerCell && (
                <div
                    className="fixed z-[9999] shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        top: Math.min(emojiPickerCell.y + 10, window.innerHeight - 450),
                        left: Math.max(10, Math.min(emojiPickerCell.x - 300, window.innerWidth - 320))
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    onMouseLeave={() => setEmojiPickerCell(null)}
                >
                    <EmojiPicker
                        onEmojiClick={(emojiData) => {
                            const emoji = emojiData.emoji;
                            const ta = emojiTextareaRefs.current[`${emojiPickerCell.rowId}_${emojiPickerCell.colId}`];
                            if (ta) {
                                const start = ta.selectionStart;
                                const end = ta.selectionEnd;
                                const current = ta.value;
                                ta.value = current.slice(0, start) + emoji + current.slice(end);
                                ta.selectionStart = ta.selectionEnd = start + emoji.length;
                                ta.focus();
                                // Trigger save
                                handleCellChange(emojiPickerCell.rowId, emojiPickerCell.colId, ta.value);
                            }
                            setEmojiPickerCell(null);
                        }}
                        width={300}
                        height={400}
                    />
                </div>
            )}

            {/* Cell Context Menu */}
            {activeCellMenu && (
                <div
                    ref={cellMenuRef}
                    style={{ top: activeCellMenu.y, left: activeCellMenu.x }}
                    className="fixed mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[300] text-gray-700 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                    {(() => {
                        const cell = filteredRows[activeCellMenu.rowIndex]?.cells?.find(c => c.columnId === activeCellMenu.colId);
                        const hasData = cell?.rawValue && cell.rawValue.trim() !== "";
                        if (!hasData) return null;
                        return (
                            <button onClick={() => handleCellAction('copy', activeCellMenu.rowIndex, activeCellMenu.colId)} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                <FiCopy className="w-4 h-4 text-blue-400" /> Copy
                            </button>
                        );
                    })()}
                    <button
                        onClick={() => handleCellAction('paste', activeCellMenu.rowIndex, activeCellMenu.colId)}
                        disabled={!cellClipboard}
                        className={`w-full text-left px-4 py-1.5 text-sm flex items-center gap-3 transition-colors ${cellClipboard ? 'hover:bg-gray-50 text-gray-700' : 'text-gray-300 cursor-not-allowed'}`}
                    >
                        <FiClipboard className="w-4 h-4 text-blue-400" /> Paste
                    </button>

                    {!isNested && (
                        <>
                            <div className="my-1 border-t border-gray-100"></div>
                            {nestedSheetsMapping[`${filteredRows[activeCellMenu.rowIndex]?.id}_${activeCellMenu.colId}`] && (
                                <>
                                    <button onClick={() => {
                                        setActiveNestedSheetId(nestedSheetsMapping[`${filteredRows[activeCellMenu.rowIndex].id}_${activeCellMenu.colId}`]);
                                        setActiveCellMenu(null);
                                    }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-blue-600 font-medium">
                                        <FiColumns className="w-4 h-4" /> Open Cell Details
                                    </button>
                                    <button
                                        onClick={() => {
                                            const row = filteredRows[activeCellMenu.rowIndex];
                                            const sheetId = nestedSheetsMapping[`${row.id}_${activeCellMenu.colId}`];
                                            setRenamingSubSheetId(sheetId);
                                            setRenamingSubSheetName("Cell Detail Sub-Sheet");
                                            setShowRenameSubSheetModal(true);
                                            setActiveCellMenu(null);
                                        }}
                                        className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-gray-600"
                                    >
                                        <FiEdit2 className="w-4 h-4 text-gray-400" /> Rename Cell Details
                                    </button>
                                </>
                            )}
                        </>
                    )}
                    <div className="my-1 border-t border-gray-100"></div>

                    <div className="px-4 py-1.5">
                        <span className="text-xs font-semibold text-gray-500 mb-2 block">Cell Color</span>
                        <div className="flex flex-wrap gap-1.5">
                            {COLOR_PALETTE.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => {
                                        const rowId = filteredRows[activeCellMenu.rowIndex]?.id;
                                        if (rowId) {
                                            updateCellStyle(rowId, activeCellMenu.colId, { bgColor: color.value });
                                        }
                                        setActiveCellMenu(null);
                                    }}
                                    className="w-5 h-5 rounded hover:scale-110 transition-transform border border-gray-200"
                                    style={{ backgroundColor: color.value || '#fff' }}
                                    title={color.name}
                                >
                                    {!color.value && <FiX className="w-3 h-3 text-gray-400 mx-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(() => {
                        const targetCell = filteredRows[activeCellMenu.rowIndex]?.cells?.find(c => c.columnId === activeCellMenu.colId);
                        const isUnderline = targetCell?.isUnderline || false;
                        const isStrikethrough = targetCell?.isStrikethrough || false;
                        const alignment = targetCell?.alignment || null;
                        const fontFamily = targetCell?.fontFamily || 'sans';
                        return (
                            <>
                                <div className="px-4 py-1 flex flex-wrap gap-1 border-t border-gray-100 pt-2.5">
                                    <button
                                        onClick={() => handleCellAction('toggle_bold', activeCellMenu.rowIndex, activeCellMenu.colId)}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${targetCell?.isBold ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Bold"
                                    >
                                        <FiBold className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleCellAction('toggle_italic', activeCellMenu.rowIndex, activeCellMenu.colId)}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${targetCell?.isItalic ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Italic"
                                    >
                                        <FiItalic className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleCellAction('toggle_underline', activeCellMenu.rowIndex, activeCellMenu.colId)}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${isUnderline ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Underline"
                                    >
                                        <FiUnderline className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleCellAction('toggle_strikethrough', activeCellMenu.rowIndex, activeCellMenu.colId)}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${isStrikethrough ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Strikethrough"
                                    >
                                        <BiStrikethrough className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="px-4 py-1 flex gap-1">
                                    <button
                                        onClick={() => handleCellAction('align_left', activeCellMenu.rowIndex, activeCellMenu.colId)}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${alignment === 'left' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Left"
                                    >
                                        <FiAlignLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleCellAction('align_center', activeCellMenu.rowIndex, activeCellMenu.colId)}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${alignment === 'center' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Center"
                                    >
                                        <FiAlignCenter className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleCellAction('align_right', activeCellMenu.rowIndex, activeCellMenu.colId)}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${alignment === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Right"
                                    >
                                        <FiAlignRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="px-4 py-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Font Family</span>
                                    <select
                                        value={fontFamily}
                                        onChange={(e) => handleCellAction(`font_${e.target.value}`, activeCellMenu.rowIndex, activeCellMenu.colId)}
                                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-1 outline-none text-gray-700"
                                    >
                                        <option value="sans">Sans-Serif</option>
                                        <option value="serif">Serif</option>
                                        <option value="mono">Monospace</option>
                                    </select>
                                </div>
                            </>
                        );
                    })()}

                    <div className="my-1 border-t border-gray-100"></div>
                    {(() => {
                        const row = filteredRows[activeCellMenu.rowIndex];
                        const hasCC = row && nestedSheetsMapping[`${row.id}_${activeCellMenu.colId}`];
                        if (hasCC) {
                            return (
                                <button onClick={() => handleCellAction('remove_cc', activeCellMenu.rowIndex, activeCellMenu.colId)} className="w-full text-left px-4 py-1.5 text-sm hover:bg-orange-50 text-orange-600 flex items-center gap-3 transition-colors mt-1">
                                    <FiScissors className="w-4 h-4 text-orange-400" /> Remove C.C.
                                </button>
                            );
                        }
                        return null;
                    })()}
                    <button onClick={() => handleCellAction('erase_data', activeCellMenu.rowIndex, activeCellMenu.colId)} className="w-full text-left px-4 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors mt-1">
                        <FiDelete className="w-4 h-4 text-red-400" /> Erase Cell Data
                    </button>
                    {sheetData?.userPermission === 'admin' && (
                        <button onClick={() => handleCellAction('delete_row', activeCellMenu.rowIndex, activeCellMenu.colId)} className="w-full text-left px-4 py-1.5 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors">
                            <FiTrash2 className="w-4 h-4 text-red-400" /> Delete Row
                        </button>
                    )}
                </div>
            )}

            {/* Row Context Menu */}
            {activeRowMenu && (
                <div
                    ref={rowMenuRef}
                    style={{ top: activeRowMenu.y, left: activeRowMenu.x }}
                    className="fixed mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[300] text-gray-700 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                    <button onClick={() => {
                        handleCellAction('add_row_above', activeRowMenu.rowIndex, null);
                        setActiveRowMenu(null);
                    }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiPlus className="w-4 h-4 text-blue-400" /> Add Row Above
                    </button>
                    <button onClick={() => {
                        handleCellAction('add_row_below', activeRowMenu.rowIndex, null);
                        setActiveRowMenu(null);
                    }} className="w-full text-left px-4 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors">
                        <FiPlus className="w-4 h-4 text-blue-400" /> Add Row Below
                    </button>
                    <div className="my-1 border-t border-gray-100"></div>

                    <div className="px-4 py-1.5">
                        <span className="text-xs font-semibold text-gray-500 mb-2 block">Row Color</span>
                        <div className="flex flex-wrap gap-1.5">
                            {COLOR_PALETTE.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => {
                                        const rowId = filteredRows[activeRowMenu.rowIndex]?.id;
                                        if (rowId) {
                                            updateRowStyle(rowId, { rowColor: color.value });
                                        }
                                        setActiveRowMenu(null);
                                    }}
                                    className="w-5 h-5 rounded hover:scale-110 transition-transform border border-gray-200"
                                    style={{ backgroundColor: color.value || '#fff' }}
                                    title={color.name}
                                >
                                    {!color.value && <FiX className="w-3 h-3 text-gray-400 mx-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(() => {
                        const targetRow = filteredRows[activeRowMenu.rowIndex];
                        if (!targetRow) return null;
                        const isUnderline = targetRow.isUnderline || false;
                        const isStrikethrough = targetRow.isStrikethrough || false;
                        const alignment = targetRow.alignment || '';
                        const fontFamily = targetRow.fontFamily || 'sans';
                        return (
                            <>
                                <div className="px-4 py-1.5 flex flex-wrap gap-1">
                                    <button
                                        onClick={() => {
                                            updateRowStyle(targetRow.id, { isBold: !targetRow.isBold });
                                            setActiveRowMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${targetRow.isBold ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Bold Row"
                                    >
                                        <FiBold className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateRowStyle(targetRow.id, { isItalic: !targetRow.isItalic });
                                            setActiveRowMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${targetRow.isItalic ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Italic Row"
                                    >
                                        <FiItalic className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateRowStyle(targetRow.id, { isUnderline: !isUnderline });
                                            setActiveRowMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${isUnderline ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Underline Row"
                                    >
                                        <FiUnderline className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateRowStyle(targetRow.id, { isStrikethrough: !isStrikethrough });
                                            setActiveRowMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${isStrikethrough ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Strikethrough Row"
                                    >
                                        <BiStrikethrough className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="px-4 py-1 flex gap-1">
                                    <button
                                        onClick={() => {
                                            updateRowStyle(targetRow.id, { alignment: 'left' });
                                            setActiveRowMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${alignment === 'left' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Left Row"
                                    >
                                        <FiAlignLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateRowStyle(targetRow.id, { alignment: 'center' });
                                            setActiveRowMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${alignment === 'center' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Center Row"
                                    >
                                        <FiAlignCenter className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateRowStyle(targetRow.id, { alignment: 'right' });
                                            setActiveRowMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border ${alignment === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Right Row"
                                    >
                                        <FiAlignRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="px-4 py-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Font Family</span>
                                    <select
                                        value={fontFamily}
                                        onChange={(e) => {
                                            updateRowStyle(targetRow.id, { fontFamily: e.target.value });
                                            setActiveRowMenu(null);
                                        }}
                                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-1 outline-none text-gray-700"
                                    >
                                        <option value="sans">Sans-Serif</option>
                                        <option value="serif">Serif</option>
                                        <option value="mono">Monospace</option>
                                    </select>
                                </div>
                            </>
                        );
                    })()}

                    {sheetData?.userPermission === 'admin' && (
                        <>
                            <div className="my-1 border-t border-gray-100"></div>
                            <button
                                onClick={() => {
                                    handleCellAction('delete_row', activeRowMenu.rowIndex, null);
                                    setActiveRowMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
                            >
                                <FiTrash2 className="w-4 h-4 text-red-400" />
                                Delete Row
                            </button>
                        </>
                    )}

                </div>
            )}

            {/* Column Context Menu */}
            {activeColumnMenu && (
                <div
                    ref={menuRef}
                    style={{ top: activeColumnMenu.y, left: activeColumnMenu.x }}
                    className="fixed mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[300] text-gray-700 select-none animate-in fade-in zoom-in-95 duration-100"
                >
                    <button
                        onClick={() => handleRenameColumnClick(activeColumnMenu.id)}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                    >
                        <FiEdit2 className="w-4 h-4 text-gray-400" />
                        Rename/Edit Column
                    </button>

                    {!isNested && !parseOptions(columns.find(c => c.id === activeColumnMenu.id)?.options).isDetailedViewEnabled && (
                        <button
                            onClick={() => {
                                setConfiguringCCColId(activeColumnMenu.id);
                                setCcTemplateColumns([{ name: '', type: 'text' }]);
                                setIsCCConfigModalOpen(true);
                                setActiveColumnMenu(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors text-blue-600 font-medium"
                        >
                            <FiColumns className="w-4 h-4" />
                            Enable C.C
                        </button>
                    )}

                    <div className="my-1 border-t border-gray-100"></div>

                    {/* Column Color Selection */}
                    <div className="px-4 py-1.5">
                        <span className="text-xs font-semibold text-gray-500 mb-2 block">Column Color</span>
                        <div className="flex flex-wrap gap-1.5">
                            {COLOR_PALETTE.map((color) => (
                                <button
                                    key={color.name}
                                    onClick={() => {
                                        updateColumnStyle(activeColumnMenu.id, { bgColor: color.value });
                                        setActiveColumnMenu(null);
                                    }}
                                    className="w-5 h-5 rounded hover:scale-110 transition-transform border border-gray-200"
                                    style={{ backgroundColor: color.value || '#fff' }}
                                    title={color.name}
                                >
                                    {!color.value && <FiX className="w-3 h-3 text-gray-400 mx-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {(() => {
                        const targetCol = columns.find(c => c.id === activeColumnMenu.id);
                        if (!targetCol) return null;
                        const isUnderline = targetCol.isUnderline || false;
                        const isStrikethrough = targetCol.isStrikethrough || false;
                        const alignment = targetCol.alignment || 'left';
                        const fontFamily = targetCol.fontFamily || 'sans';
                        return (
                            <>
                                <div className="px-4 py-1.5 flex flex-wrap gap-1">
                                    <button
                                        onClick={() => {
                                            updateColumnStyle(targetCol.id, { isBold: !targetCol.isBold });
                                            setActiveColumnMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border transition-colors ${targetCol.isBold ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Bold Column"
                                    >
                                        <FiBold className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateColumnStyle(targetCol.id, { isItalic: !targetCol.isItalic });
                                            setActiveColumnMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border transition-colors ${targetCol.isItalic ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Italic Column"
                                    >
                                        <FiItalic className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateColumnStyle(targetCol.id, { isUnderline: !isUnderline });
                                            setActiveColumnMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border transition-colors ${isUnderline ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Underline Column"
                                    >
                                        <FiUnderline className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateColumnStyle(targetCol.id, { isStrikethrough: !isStrikethrough });
                                            setActiveColumnMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border transition-colors ${isStrikethrough ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Strikethrough Column"
                                    >
                                        <BiStrikethrough className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="px-4 py-1 flex gap-1">
                                    <button
                                        onClick={() => {
                                            updateColumnStyle(targetCol.id, { alignment: 'left' });
                                            setActiveColumnMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border transition-colors ${alignment === 'left' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Left Column"
                                    >
                                        <FiAlignLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateColumnStyle(targetCol.id, { alignment: 'center' });
                                            setActiveColumnMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border transition-colors ${alignment === 'center' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Center Column"
                                    >
                                        <FiAlignCenter className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateColumnStyle(targetCol.id, { alignment: 'right' });
                                            setActiveColumnMenu(null);
                                        }}
                                        className={`p-1.5 rounded hover:bg-gray-100 border transition-colors ${alignment === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Align Right Column"
                                    >
                                        <FiAlignRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="px-4 py-1.5">
                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Font Family</span>
                                    <select
                                        value={fontFamily}
                                        onChange={(e) => {
                                            updateColumnStyle(targetCol.id, { fontFamily: e.target.value });
                                            setActiveColumnMenu(null);
                                        }}
                                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded p-1 outline-none text-gray-700"
                                    >
                                        <option value="sans">Sans-Serif</option>
                                        <option value="serif">Serif</option>
                                        <option value="mono">Monospace</option>
                                    </select>
                                </div>
                            </>
                        );
                    })()}

                    {(sheetData?.userPermission === 'admin' || sheetData?.userPermission === 'editor') && (
                        <>
                            <div className="my-1 border-t border-gray-100"></div>
                            {columns.find(c => c.id === activeColumnMenu.id)?.type === 'formula' && (
                                <button
                                    onClick={() => handleSetFormulaClick(activeColumnMenu.id)}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                >
                                    <TbMathFunction className="w-4 h-4 text-blue-500" />
                                    Formula Builder
                                </button>
                            )}
                            <button
                                onClick={() => handleAddColumnDirection(activeColumnMenu.id, 'left')}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                            >
                                <BiArrowToLeft className="w-4 h-4 text-gray-400" />
                                Add Column to Left
                            </button>
                            <button
                                onClick={() => handleAddColumnDirection(activeColumnMenu.id, 'right')}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                            >
                                <BiArrowToRight className="w-4 h-4 text-gray-400" />
                                Add Column to Right
                            </button>
                        </>
                    )}
                    {sheetData?.userPermission === 'admin' && (
                        <>
                            <div className="my-1 border-t border-gray-100"></div>
                            <button
                                onClick={() => handleDeleteClick(columns.find(c => c.id === activeColumnMenu.id))}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
                            >
                                <FiTrash2 className="w-4 h-4 text-red-400" />
                                Delete Column
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Column Modal */}
            {isColumnModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg">
                                {editingColId ? 'Rename/Edit Column' : 'Choose Column Type'}
                            </h2>
                            <button
                                onClick={() => setIsColumnModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newColumnName}
                                        onChange={(e) => setNewColumnName(e.target.value)}
                                        placeholder="Enter name for Column"
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400 bg-gray-50/50"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                                {columnTypes.map(type => (
                                    <div
                                        key={type.id}
                                        onClick={() => setNewColumnType(type.id)}
                                        className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all border-2
                                            ${newColumnType === type.id
                                                ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                                                : 'border-transparent hover:bg-gray-50'}`}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                                            {type.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">{type.name}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{type.desc}</p>
                                        </div>
                                        <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                                            <div className={`w-2 h-2 rounded-full transition-transform ${newColumnType === type.id ? 'bg-blue-500 scale-100' : 'scale-0'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Column Color Selection */}
                            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700">Column Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PALETTE.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => setNewColumnBgColor(color.value)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${newColumnBgColor === color.value ? 'border-blue-500 scale-110 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                                            style={{ backgroundColor: color.value || '#fff' }}
                                            title={color.name}
                                        >
                                            {!color.value && <FiX className="w-4 h-4 text-gray-400 mx-auto" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700">Font Style</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNewColumnIsBold(!newColumnIsBold)}
                                        className={`p-2 rounded hover:bg-gray-100 border transition-colors ${newColumnIsBold ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Bold Column"
                                    >
                                        <FiBold className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setNewColumnIsItalic(!newColumnIsItalic)}
                                        className={`p-2 rounded hover:bg-gray-100 border transition-colors ${newColumnIsItalic ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Italic Column"
                                    >
                                        <FiItalic className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setNewColumnIsUnderline(!newColumnIsUnderline)}
                                        className={`p-2 rounded hover:bg-gray-100 border transition-colors ${newColumnIsUnderline ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Underline Column"
                                    >
                                        <FiUnderline className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setNewColumnIsStrikethrough(!newColumnIsStrikethrough)}
                                        className={`p-2 rounded hover:bg-gray-100 border transition-colors ${newColumnIsStrikethrough ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Strikethrough Column"
                                    >
                                        <BiStrikethrough className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700">Font Family</label>
                                <select
                                    value={newColumnFontFamily}
                                    onChange={(e) => setNewColumnFontFamily(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-gray-50/50 text-sm text-gray-700"
                                >
                                    <option value="sans">Sans-Serif</option>
                                    <option value="serif">Serif</option>
                                    <option value="mono">Monospace</option>
                                </select>
                            </div>

                            <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700">Alignment</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNewColumnAlignment('left')}
                                        className={`p-2 rounded hover:bg-gray-100 border transition-colors ${newColumnAlignment === 'left' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Left Align"
                                    >
                                        <FiAlignLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setNewColumnAlignment('center')}
                                        className={`p-2 rounded hover:bg-gray-100 border transition-colors ${newColumnAlignment === 'center' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Center Align"
                                    >
                                        <FiAlignCenter className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setNewColumnAlignment('right')}
                                        className={`p-2 rounded hover:bg-gray-100 border transition-colors ${newColumnAlignment === 'right' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}
                                        title="Right Align"
                                    >
                                        <FiAlignRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {!isNested && (
                                <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input
                                                type="checkbox"
                                                checked={newColumnIsDetailedView}
                                                onChange={(e) => setNewColumnIsDetailedView(e.target.checked)}
                                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">Enable C.C</span>
                                            <p className="text-[11px] text-gray-400">Shows a sub-sheet indicator on all cells in this column</p>
                                        </div>
                                    </label>
                                </div>
                            )}


                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 shrink-0">
                            <button
                                onClick={() => setIsColumnModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-transparent"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateColumn}
                                disabled={!newColumnName.trim()}
                                className="px-5 py-2 text-sm font-medium bg-[#3b82f6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
                            >
                                {editingColId ? 'Save Changes' : 'Add Column'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Formula Builder Modal */}
            {isFormulaModalOpen && pendingFormulaColumnDesc && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg">
                                Add Formula to "{pendingFormulaColumnDesc.name}"
                            </h2>
                            <button
                                onClick={() => {
                                    setIsFormulaModalOpen(false);
                                    setFormulaString('');
                                    setPendingFormulaColumnDesc(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Formula Input Box */}
                            <div className="w-full">
                                <input
                                    type="text"
                                    value={formulaString}
                                    onChange={(e) => setFormulaString(e.target.value)}
                                    placeholder="Eg. (Column A + Column B)/12"
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-gray-700 bg-gray-50"
                                    autoFocus
                                />
                            </div>

                            <div className="flex gap-6 pt-2">
                                {/* Left Side: Clickable Columns List */}
                                <div className="w-1/2 flex flex-col">
                                    <div className="text-xs text-gray-500 mb-2 font-medium">
                                        Add column values to formula by clicking column names from below list:
                                    </div>
                                    <div className="flex-col overflow-y-auto max-h-56 pr-2 space-y-1.5 custom-scrollbar">
                                        {columns.filter(col => col.type === 'number' || col.type === 'currency').map((col, idx) => {
                                            if (col.id === pendingFormulaColumnDesc.id) return null; // Don't allow self-reference

                                            // Calculate A1 notation for this column (e.g., A, B, C...)
                                            const letter = String.fromCharCode(65 + (idx % 26));

                                            return (
                                                <button
                                                    key={col.id}
                                                    onClick={() => setFormulaString(prev => prev + col.name)}
                                                    className="w-full text-left flex items-center gap-3 px-3 py-2 border border-gray-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors group bg-white"
                                                >
                                                    <div className="w-6 flex justify-center text-gray-400 group-hover:text-blue-500">
                                                        {col.type === 'number' ? <span className="text-xs font-medium">123</span> :
                                                            col.type === 'currency' ? <span className="text-sm">₹</span> :
                                                                col.type === 'formula' ? <span className="italic font-serif text-sm">fx</span> :
                                                                    col.type === 'date' ? <span className="text-sm">📅</span> :
                                                                        <span className="font-serif">T</span>}
                                                    </div>
                                                    <span className="text-sm text-gray-700 font-medium group-hover:text-blue-700">{col.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Calculator Keypad */}
                                <div className="w-1/2 flex flex-col gap-2">
                                    <div className="flex justify-end mb-1">
                                        <button
                                            onClick={() => setFormulaString(prev => prev.slice(0, -1))}
                                            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 flex-grow">
                                        {['+', '-', '/', '*', '7', '8', '9', '%', '4', '5', '6', '(', '1', '2', '3', ')', 'fn', '0', '.', ','].map(key => (
                                            <button
                                                key={key}
                                                onClick={() => {
                                                    if (key !== 'fn') setFormulaString(prev => prev + key);
                                                }}
                                                className="bg-gray-50 hover:bg-gray-100 border border-gray-100 shadow-sm rounded-lg text-gray-700 font-medium py-3 transition-colors active:bg-gray-200 text-sm"
                                            >
                                                {key}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 shrink-0 bg-gray-50/50">
                            <button
                                onClick={() => {
                                    setIsFormulaModalOpen(false);
                                    setFormulaString('');
                                    setPendingFormulaColumnDesc(null);
                                    // Only go back to column modal if we came from it (new column flow)
                                    // Don't open it if Formula Builder was launched directly from column dropdown
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 bg-white rounded-lg transition-colors border border-gray-200 shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    let query = formulaString;
                                    if (!query.startsWith('=')) query = '=' + query;

                                    // Submit to the original payload handler
                                    const formulaColCurrencyCode = pendingFormulaColumnDesc.currencyCode;

                                    // Set state so saveColumnToBackend uses correct currency
                                    setNewColumnCurrencyCode(formulaColCurrencyCode);

                                    saveColumnToBackend(
                                        pendingFormulaColumnDesc.name,
                                        pendingFormulaColumnDesc.type,
                                        pendingFormulaColumnDesc.id,
                                        query,
                                        newColumnBgColor,
                                        newColumnIsBold,
                                        newColumnIsItalic,
                                        newColumnWidth,
                                        newColumnIsUnderline,
                                        newColumnIsStrikethrough,
                                        newColumnFontFamily,
                                        newColumnAlignment
                                    );
                                }}
                                disabled={!formulaString.trim()}
                                className="px-5 py-2 text-sm font-medium bg-[#3b82f6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
                            >
                                Add Formula
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Image Gallery Modal */}
            {isImageGalleryOpen && activeImageCell && (
                <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4 sm:p-6">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                                <FiImage className="text-blue-500" />
                                Image Gallery <span className="text-gray-400 text-sm font-normal">({activeImageCell.images?.length || 0} images)</span>
                            </h2>
                            <button
                                onClick={() => setIsImageGalleryOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                            {activeImageCell.images?.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                    <FiImage className="w-16 h-16 text-gray-200" />
                                    <p>No images in this cell</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {activeImageCell.images.map((img, index) => (
                                        <div
                                            key={index}
                                            className="group relative aspect-square bg-gray-100 rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-zoom-in"
                                            onClick={() => {
                                                setSelectedPreviewImage(getMediaUrl(img.url));
                                                setActivePreviewIndex(index);
                                            }}
                                        >
                                            <img
                                                src={getMediaUrl(img.url)}
                                                alt={img.fileName || 'Cell Image'}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 lg:opacity-0 lg:group-hover:opacity-100 opacity-100 transition-opacity flex justify-between items-end">
                                                <div className="text-[10px] text-white/90 truncate pr-2">
                                                    {img.fileName}
                                                </div>
                                                {activeImageCell.permission !== 'view' && (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteImage(index); }}
                                                        className="text-red-400 hover:text-red-300 bg-white/10 rounded p-1 backdrop-blur-sm shrink-0"
                                                        title="Delete image"
                                                    >
                                                        <FiTrash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Upload Area */}
                        {activeImageCell.permission !== 'view' && (
                            <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer text-gray-500 font-medium group">
                                        {isUploadingImages ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <FiUploadCloud className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                                                Upload Images
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    className="hidden"
                                                    ref={fileInputRef}
                                                    onChange={handleImagesSelected}
                                                />
                                            </>
                                        )}
                                    </label>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-2">
                                    Accepts multiple images. Max 50MB per file.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* PDF Gallery Modal */}
            {isPDFGalleryOpen && activePDFCell && (
                <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4 sm:p-6" onClick={() => setIsPDFGalleryOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[70vh]" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                                <FiFileText className="text-red-500" />
                                PDF Documents <span className="text-gray-400 text-sm font-normal">({activePDFCell.documents?.length || 0} files)</span>
                            </h2>
                            <button
                                onClick={() => setIsPDFGalleryOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content Area - List View for PDFs */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                            {activePDFCell.documents?.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
                                    <FiFileText className="w-16 h-16 text-gray-200" />
                                    <p>No PDF documents in this cell</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {activePDFCell.documents.map((doc, index) => (
                                        <div
                                            key={index}
                                            className="group flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-red-200 transition-all"
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-10 h-10 rounded bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                                                    <FiFileText className="text-red-500 w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-sm font-medium text-gray-700 truncate" title={doc.fileName}>
                                                        {doc.fileName}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {(doc.fileSize / 1024 / 1024).toFixed(2)} MB • {new Date(doc.uploadedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 ml-4">
                                                <a
                                                    href={getMediaUrl(doc.url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View PDF"
                                                >
                                                    <FiExternalLink className="w-4 h-4" />
                                                </a>
                                                {activePDFCell.permission !== 'view' && (
                                                    <button
                                                        onClick={() => handleDeletePDF(index)}
                                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Upload Area */}
                        {activePDFCell.permission !== 'view' && (
                            <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                                <div className="flex items-center gap-4">
                                    <label className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-300 rounded-xl hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-colors cursor-pointer text-gray-500 font-medium group">
                                        {isUploadingPDFs ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Uploading PDFs...
                                            </>
                                        ) : (
                                            <>
                                                <FiUploadCloud className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                                                Upload PDFs
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="application/pdf"
                                                    className="hidden"
                                                    ref={pdfInputRef}
                                                    onChange={handlePDFsSelected}
                                                />
                                            </>
                                        )}
                                    </label>
                                </div>
                                <p className="text-center text-xs text-gray-400 mt-2">
                                    Only PDF files are accepted. Max 50MB per file.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* ── Comment Panel Modal ──────────────────────────────────────── */}
            {commentPanelCell && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={closeCommentPanel}>
                    <div
                        className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[400px] max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
                            <h2 className="font-semibold text-gray-800 text-lg flex items-center gap-2">
                                <FiMessageSquare className="text-blue-500 w-5 h-5" />
                                Comments
                            </h2>
                            <button onClick={closeCommentPanel} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Comments Thread */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                            {commentsLoading ? (
                                <div className="flex justify-center items-center h-32">
                                    <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            ) : commentsList.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                                    <FiMessageSquare className="w-10 h-10 text-gray-200 mb-2" />
                                    <p className="text-sm">No comments yet</p>
                                    <p className="text-xs text-gray-300 mt-1">Be the first to add a comment</p>
                                </div>
                            ) : (
                                [...commentsList].reverse().map(comment => {
                                    const isOwner = currentUser?.id === comment.userId;
                                    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
                                    const isEditing = editingComment?.id === comment.id;

                                    return (
                                        <div key={comment.id} className="group">
                                            <div className="flex items-start gap-3">
                                                {/* Avatar */}
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                                                    {(comment.author?.name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm text-gray-800">
                                                            {comment.author?.name || 'Unknown User'}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400">
                                                            {new Date(comment.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(comment.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {comment.updatedAt !== comment.createdAt && (
                                                            <span className="text-[10px] text-gray-300 italic">(edited)</span>
                                                        )}
                                                        {/* Edit / Delete buttons */}
                                                        {(isOwner || isAdmin) && !isEditing && commentPanelCell.permission !== 'view' && (
                                                            <div className="flex items-center gap-1 ml-auto">
                                                                {isOwner && (
                                                                    <button
                                                                        onClick={() => setEditingComment({ id: comment.id, text: comment.text })}
                                                                        className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <FiEdit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeleteComment(comment.id)}
                                                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Comment text or edit input */}
                                                    {isEditing ? (
                                                        <div className="mt-1 flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={editingComment.text}
                                                                onChange={(e) => setEditingComment(prev => ({ ...prev, text: e.target.value }))}
                                                                className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30"
                                                                autoFocus
                                                                onKeyDown={(e) => { if (e.key === 'Enter') handleEditComment(comment.id); if (e.key === 'Escape') setEditingComment(null); }}
                                                                maxLength={2000}
                                                            />
                                                            <button
                                                                onClick={() => handleEditComment(comment.id)}
                                                                disabled={!editingComment.text.trim() || commentSubmitting}
                                                                className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingComment(null)}
                                                                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-600 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">{comment.text}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Add Comment Input */}
                        {commentPanelCell.permission !== 'view' && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
                                <div className="flex items-end gap-2">
                                    <textarea
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        placeholder="Type your comment here..."
                                        className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white transition-all placeholder-gray-400"
                                        rows={2}
                                        maxLength={2000}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newCommentText.trim() || commentSubmitting}
                                        className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shadow-sm flex items-center gap-1.5 text-sm font-medium shrink-0"
                                    >
                                        {commentSubmitting ? (
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <FiSend className="w-4 h-4" />
                                        )}
                                        Add
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1.5 ml-1">Press Enter to submit, Shift+Enter for new line</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                sheetId={docName}
            />

            {/* PDF Export Selection Modal */}
            <PDFExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                columns={columns}
                selectedColumns={exportSelectedColumns}
                setSelectedColumns={setExportSelectedColumns}
                onExport={executePDFExport}
            />

            {/* Image Zoom/Preview Modal */}
            {selectedPreviewImage && (
                <div
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-10 select-none cursor-default"
                    onClick={() => { setSelectedPreviewImage(null); setActivePreviewIndex(null); }}
                >
                    {/* Close Button */}
                    <button
                        className="absolute top-6 right-6 text-white/70 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 bg-white/5 hover:bg-white/10 p-3 rounded-full backdrop-blur-md border border-white/10 shadow-lg z-[110]"
                        onClick={() => { setSelectedPreviewImage(null); setActivePreviewIndex(null); }}
                        title="Close (Esc)"
                    >
                        <FiX className="w-6 h-6" />
                    </button>

                    {/* Left Navigation Arrow */}
                    {activeImageCell?.images && activeImageCell.images.length > 1 && (
                        <button
                            className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 text-white/90 hover:text-white bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/15 rounded-full p-3 sm:p-4 transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center pointer-events-auto cursor-pointer shadow-2xl z-[110]"
                            onClick={handlePrevImage}
                            title="Previous Image (Left Arrow)"
                        >
                            <FiChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                        </button>
                    )}

                    {/* Image Display Container */}
                    <div 
                        className="relative max-w-full max-h-full flex flex-col items-center justify-center px-16 sm:px-0"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={selectedPreviewImage}
                            className="max-w-full max-h-[75vh] sm:max-h-[80vh] object-contain shadow-2xl rounded-lg border border-white/10 transition-all duration-300 animate-in fade-in zoom-in-95"
                            alt="Zoomed Preview"
                        />
                        
                        {/* Image Counter & Filename */}
                        {activeImageCell?.images && activeImageCell.images.length > 1 && activePreviewIndex !== null && (
                            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full text-white/90 text-xs sm:text-sm font-medium flex items-center gap-2 border border-white/10 shadow-xl whitespace-nowrap">
                                <span className="text-white/60">{activePreviewIndex + 1} / {activeImageCell.images.length}</span>
                                <span className="w-1 h-1 rounded-full bg-white/30"></span>
                                <span className="max-w-[150px] sm:max-w-[250px] truncate text-white/80 font-normal">
                                    {activeImageCell.images[activePreviewIndex]?.fileName || 'Image'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right Navigation Arrow */}
                    {activeImageCell?.images && activeImageCell.images.length > 1 && (
                        <button
                            className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 text-white/90 hover:text-white bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/15 rounded-full p-3 sm:p-4 transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center pointer-events-auto cursor-pointer shadow-2xl z-[110]"
                            onClick={handleNextImage}
                            title="Next Image (Right Arrow)"
                        >
                            <FiChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                        </button>
                    )}
                </div>
            )}
            <ColumnUpdateConfirmModal
                isOpen={showUpdateConfirmModal}
                onClose={() => setShowUpdateConfirmModal(false)}
                onConfirm={performUpdateColumn}
                columnName={newColumnName}
                isEdit={!!editingColId}
                isTypeChanged={!!(editingColId && columns.find(c => c.id === editingColId)?.type !== newColumnType)}
            />
            <ColumnDeleteConfirmModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={performDeleteColumn}
                columnName={columnToDelete?.name}
            />
            <EnableRowConfirmModal
                isOpen={showEnableRowModal}
                onClose={() => setShowEnableRowModal(false)}
                onConfirm={performEnableRow}
                value={newNestedSheetName}
                onChange={setNewNestedSheetName}
            />

            {/* Nested Spreadsheet Modal */}
            {activeNestedSheetId && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-7xl h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        {/* Recursive Nested Content */}
                        <div className="flex-1 overflow-hidden relative bg-white">
                            {/* Close button overlayed or integrated into child header */}
                            <button
                                onClick={() => setActiveNestedSheetId(null)}
                                className="absolute top-4 right-6 z-[310] text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors p-1.5 rounded-lg"
                                title="Close Details"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                            <DocumentEditor docName={activeNestedSheetId} isNested={true} />
                        </div>
                    </div>
                </div>
            )}

            <RenameSubSheetModal
                isOpen={showRenameSubSheetModal}
                onClose={() => setShowRenameSubSheetModal(false)}
                onConfirm={performRenameSubSheet}
                value={renamingSubSheetName}
                onChange={setRenamingSubSheetName}
            />

            <PDFDeleteConfirmModal
                isOpen={showPDFDeleteConfirmModal}
                onClose={() => {
                    setShowPDFDeleteConfirmModal(false);
                    setPdfToDeleteIndex(null);
                }}
                onConfirm={confirmDeletePDF}
                fileName={pdfToDeleteIndex !== null ? activePDFCell?.documents[pdfToDeleteIndex]?.fileName : ""}
            />

            <ImageDeleteConfirmModal
                isOpen={showImageDeleteConfirmModal}
                onClose={() => {
                    setShowImageDeleteConfirmModal(false);
                    setImageToDeleteIndex(null);
                }}
                onConfirm={confirmDeleteImage}
                fileName={imageToDeleteIndex !== null ? activeImageCell?.images[imageToDeleteIndex]?.fileName : ""}
            />

            <CommentDeleteConfirmModal
                isOpen={showCommentDeleteConfirmModal}
                onClose={() => {
                    setShowCommentDeleteConfirmModal(false);
                    setCommentToDeleteId(null);
                }}
                onConfirm={confirmDeleteComment}
            />
            <CCConfigModal
                isOpen={isCCConfigModalOpen}
                onClose={() => setIsCCConfigModalOpen(false)}
                onConfirm={handleCCConfigConfirm}
                templateColumns={ccTemplateColumns}
                setTemplateColumns={setCcTemplateColumns}
                columnTypes={columnTypes}
            />
            </>
            )}
        </div>
    );
}

const CCConfigModal = ({ isOpen, onClose, onConfirm, templateColumns, setTemplateColumns, columnTypes }) => {
    if (!isOpen) return null;

    const addColumn = () => {
        setTemplateColumns([...templateColumns, { name: '', type: 'text' }]);
    };

    const removeColumn = (index) => {
        setTemplateColumns(templateColumns.filter((_, i) => i !== index));
    };

    const updateColumn = (index, field, value) => {
        setTemplateColumns(templateColumns.map((col, i) =>
            i === index ? { ...col, [field]: value } : col
        ));
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-2xl bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                {/* Decorative backgrounds */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-blue-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col space-y-6 flex-1 min-h-0 relative z-10">
                    <div className="flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                <FiColumns className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Set C.C Template</h3>
                                <p className="text-gray-400 text-sm">Configure default columns for all cell details in this column.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {templateColumns.map((col, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Column Name</label>
                                        <input
                                            type="text"
                                            value={col.name}
                                            onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                                            placeholder="Enter column name..."
                                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-600"
                                        />
                                    </div>
                                    <div className="w-48 space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Type</label>
                                        <select
                                            value={col.type}
                                            onChange={(e) => updateColumn(idx, 'type', e.target.value)}
                                            className="w-full px-4 py-2 bg-[#1a1c23] border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        >
                                            {columnTypes.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => removeColumn(idx)}
                                        className="mt-6 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                        title="Remove Column"
                                    >
                                        <FiTrash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={addColumn}
                            className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/5 transition-all flex items-center justify-center gap-2 group"
                        >
                            <FiPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold">Add New Column</span>
                        </button>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/10 shrink-0">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={templateColumns.length === 0 || templateColumns.some(c => !c.name.trim())}
                            className="flex-[2] py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-white font-bold shadow-lg shadow-blue-900/40 hover:from-blue-500 hover:to-blue-400 transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2"
                        >
                            Apply to all cells in this column
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EnableRowConfirmModal = ({ isOpen, onClose, onConfirm, value, onChange }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <FiColumns className="w-8 h-8 text-blue-500" />
                    </div>

                    <div className="space-y-4 w-full text-left">
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white tracking-tight">Enable Row in Column</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mt-1">
                                Give a name to the C.C sub-sheet.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Sub-Sheet Name</label>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="Enter name..."
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex w-full gap-3 mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={!value.trim()}
                            className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg shadow-blue-900/40 hover:from-blue-500 hover:to-blue-400 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none"
                        >
                            Confirm
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const RenameSubSheetModal = ({ isOpen, onClose, onConfirm, value, onChange }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                        <FiEdit2 className="w-8 h-8 text-blue-500" />
                    </div>

                    <div className="space-y-4 w-full text-left">
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white tracking-tight">Rename Detail View</h3>
                            <p className="text-gray-400 text-sm leading-relaxed mt-1">
                                Update the name for this C.C.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">New Name</label>
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="Enter name..."
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="flex w-full gap-3 mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={!value.trim()}
                            className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg shadow-blue-900/40 hover:from-blue-500 hover:to-blue-400 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const ColumnUpdateConfirmModal = ({ isOpen, onClose, onConfirm, columnName, isEdit, isTypeChanged }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isTypeChanged ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                        <FiAlertCircle className={`w-8 h-8 ${isTypeChanged ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            {isEdit ? 'Rename/Edit Column' : 'Add New Column'}
                        </h3>
                        <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                            <p>
                                {isEdit
                                    ? `Are you sure you want to save the changes for "${columnName}"?`
                                    : `Are you sure you want to add the column "${columnName}" to this spreadsheet?`
                                }
                            </p>
                            {isTypeChanged && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                    <p className="text-red-400 font-semibold animate-pulse">
                                        ⚠️ WARNING: Changing the column type will PERMANENTLY delete all existing data in this column.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex w-full gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-lg shadow-blue-900/40 hover:from-blue-500 hover:to-blue-400 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            Confirm
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const ColumnDeleteConfirmModal = ({ isOpen, onClose, onConfirm, columnName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-red-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                        <FiTrash2 className="w-8 h-8 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">Delete Column</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Are you sure you want to permanently delete the column <span className="text-white font-semibold">"{columnName}"</span>? <br />
                            <span className="text-red-400/80 font-medium">This action cannot be undone and all data will be lost.</span>
                        </p>
                    </div>

                    <div className="flex w-full gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg shadow-red-900/40 hover:from-red-500 hover:to-red-400 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            Delete Now
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const PDFExportModal = ({ isOpen, onClose, onExport, columns, selectedColumns, setSelectedColumns }) => {
    if (!isOpen) return null;

    const setAllPermissions = (value) => {
        const next = {};
        columns.forEach(c => next[c.id] = value);
        setSelectedColumns(next);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <h2 className="text-xl font-semibold text-gray-800">Export as PDF</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-2 text-sm text-gray-600">Select which columns to export into the PDF.</div>

                    <div className="mb-5 border border-blue-100 rounded-xl bg-blue-50/30 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FiColumns className="w-4 h-4 text-blue-600" />
                                <h4 className="text-sm font-semibold text-gray-800">Column Granular Access</h4>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => setAllPermissions(true)} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-100 font-medium text-gray-600 transition-colors">Select All</button>
                                <button onClick={() => setAllPermissions(false)} className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded hover:bg-gray-100 font-medium text-gray-600 transition-colors">Deselect All</button>
                            </div>
                        </div>

                        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                            {columns.map((col) => {
                                const isChecked = !!selectedColumns[col.id];
                                return (
                                    <div key={col.id} className="flex items-center justify-between gap-3 px-3 py-2 bg-white rounded-lg border border-gray-100 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setSelectedColumns(prev => ({ ...prev, [col.id]: checked }));
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-sm ${isChecked ? 'text-gray-800' : 'text-gray-400'} truncate`}>{col.name}</span>
                                                <span className="text-[9px] text-gray-400 uppercase font-medium">{col.type}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3 rounded-b-2xl shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onExport}
                        disabled={Object.values(selectedColumns).filter(Boolean).length === 0}
                        className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <FiDownload className="w-4 h-4" />
                        Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

const PDFDeleteConfirmModal = ({ isOpen, onClose, onConfirm, fileName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-red-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                        <FiTrash2 className="w-8 h-8 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">Delete PDF Document</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Are you sure you want to permanently delete <span className="text-white font-semibold">"{fileName}"</span>? <br />
                            <span className="text-red-400/80 font-medium">This action cannot be undone.</span>
                        </p>
                    </div>

                    <div className="flex w-full gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg shadow-red-900/40 hover:from-red-500 hover:to-red-400 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            Delete Now
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const ImageDeleteConfirmModal = ({ isOpen, onClose, onConfirm, fileName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-red-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                        <FiTrash2 className="w-8 h-8 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">Delete Image</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Are you sure you want to permanently delete <span className="text-white font-semibold">"{fileName}"</span>? <br />
                            <span className="text-red-400/80 font-medium">This action cannot be undone.</span>
                        </p>
                    </div>

                    <div className="flex w-full gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg shadow-red-900/40 hover:from-red-500 hover:to-red-400 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            Delete Now
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

const CommentDeleteConfirmModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            {/* Glass Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-red-500/10 blur-2xl rounded-full"></div>
                <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-24 h-24 bg-indigo-500/10 blur-2xl rounded-full"></div>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                        <FiTrash2 className="w-8 h-8 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">Delete Comment</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Are you sure you want to permanently delete this comment? <br />
                            <span className="text-red-400/80 font-medium">This action cannot be undone.</span>
                        </p>
                    </div>

                    <div className="flex w-full gap-3 mt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-gray-300 font-semibold hover:bg-white/5 hover:text-white transition-all transform hover:scale-[1.02] active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 px-4 rounded-xl bg-linear-to-r from-red-600 to-red-500 text-white font-semibold shadow-lg shadow-red-900/40 hover:from-red-500 hover:to-red-400 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            Delete Now
                        </button>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
