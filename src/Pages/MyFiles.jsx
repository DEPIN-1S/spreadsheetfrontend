import { useState, useRef, useEffect, useCallback } from "react";
import { FiSearch, FiPlus, FiFileText, FiFolder, FiMenu, FiX, FiMoreVertical, FiEdit2, FiTrash2, FiChevronRight, FiMove, FiArrowUp, FiArrowDown, FiShare2 } from "react-icons/fi";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import apiClient from "../api/apiClient";
import Swal from "sweetalert2";
import ShareModal from "../Components/ShareModal";
export default function MyFiles({ setMobileOpen, setActivePath, setCurrentDocName, setReturnPath, currentFolderId, setCurrentFolderId, path, setPath }) {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isStaff = currentUser.role === 'staff';

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [newDocName, setNewDocName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState('name_asc'); // 'name_asc' | 'name_desc' | 'date_newest' | 'date_oldest'
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef(null);

    // Unified Items State
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [activeItemId, setActiveItemId] = useState(null);
    const [renameItemName, setRenameItemName] = useState("");
    const [moveDestinationId, setMoveDestinationId] = useState(null);
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [duplicateItemName, setDuplicateItemName] = useState("");
    const [duplicateItemId, setDuplicateItemId] = useState(null);
    const [duplicateItemType, setDuplicateItemType] = useState(null);
    
    // Sharing State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareItemId, setShareItemId] = useState(null);
    const [shareItemType, setShareItemType] = useState(null); // 'file' | 'folder'

    // Fetch data from API
    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch folders tree and ALL sheets in parallel
            const [folderRes, sheetsRes] = await Promise.all([
                apiClient.get('/folders'),
                apiClient.get('/sheets', { params: { limit: 1000 } })
            ]);

            const fetchedItems = [];
            const addedSheetIds = new Set(); // Track added sheet IDs to prevent duplicates

            // Flatten the folder tree — only extract personal FOLDERS, not sheets or shared organization folders
            const flattenFolders = (folderNodes) => {
                for (const node of folderNodes) {
                    if (!node.category || node.category === 'personal') {
                        fetchedItems.push({
                            id: node.id,
                            type: "folder",
                            title: node.name,
                            date: new Date(node.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                            rawDate: node.createdAt, // kept for accurate date sort
                            parentId: node.parentId
                        });
                    }
                    if (node.children && node.children.length > 0) {
                        flattenFolders(node.children);
                    }
                }
            };

            if (folderRes.data && folderRes.data.data) {
                flattenFolders(folderRes.data.data);
            }

            // Add ALL sheets — use folderId to determine parentId
            const allSheets = sheetsRes.data?.data || [];
            for (const sheet of allSheets) {
                if (addedSheetIds.has(sheet.id)) continue; // Skip duplicates
                addedSheetIds.add(sheet.id);
                fetchedItems.push({
                    id: sheet.id,
                    type: "file",
                    title: sheet.name,
                    date: new Date(sheet.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    rawDate: sheet.createdAt, // kept for accurate date sort
                    parentId: sheet.folderId || null
                });
            }

            setItems(fetchedItems);
        } catch (error) {
            console.error("Error fetching items:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Close sort dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            await apiClient.post('/folders', { 
                name: newFolderName, 
                parentId: currentFolderId 
            });
            fetchItems();
            setNewFolderName("");
            setIsModalOpen(false);
            setIsDropdownOpen(false);
        } catch (error) {
            console.error("Error creating folder:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to create folder',
                customClass: { popup: 'rounded-2xl' }
            });
        }
    };

    const handleCreateDocumentClick = () => {
        setNewDocName("");
        setIsDocModalOpen(true);
        setIsDropdownOpen(false);
    };

    const handleCreateDocumentSubmit = async () => {
        if (!newDocName.trim()) return;

        try {
            const response = await apiClient.post('/sheets', {
                name: newDocName,
                folderId: currentFolderId
            });
            const newSheet = response.data.data;
            fetchItems();
            setCurrentDocName(newSheet.id);
            setReturnPath('/my-files');
            setActivePath('/document-editor');
            setIsDocModalOpen(false);
        } catch (error) {
            console.error("Error creating document:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to create document',
                customClass: { popup: 'rounded-2xl' }
            });
        }
    };





    const navigateToFolder = (folderId, folderTitle) => {
        setCurrentFolderId(folderId);
        setPath([...path, { id: folderId, title: folderTitle }]);
    };

    const navigateToBreadcrumb = (index) => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        const lastFolder = newPath.at(-1);
        if (lastFolder) {
            setCurrentFolderId(lastFolder.id);
        }
    };

    const openRenameModal = (id, currentTitle) => {
        setActiveItemId(id);
        setRenameItemName(currentTitle);
        setIsRenameModalOpen(true);
    };

    const handleShareItem = (id, type) => {
        setShareItemId(id);
        setShareItemType(type);
        setIsShareModalOpen(true);
    };

    const handleRenameItem = async () => {
        if (!renameItemName.trim() || activeItemId === null) return;

        const itemToRename = items.find(i => i.id === activeItemId);
        if (!itemToRename) return;

        try {
            if (itemToRename.type === "folder") {
                await apiClient.put(`/folders/${activeItemId}`, { name: renameItemName });
            } else {
                await apiClient.put(`/sheets/${activeItemId}`, { name: renameItemName });
            }
            fetchItems();
            setIsRenameModalOpen(false);
            setActiveItemId(null);
        } catch (error) {
            console.error("Error renaming item:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to rename item',
                customClass: { popup: 'rounded-2xl' }
            });
        }
    };

    const openMoveModal = (id) => {
        setActiveItemId(id);
        setIsMoveModalOpen(true);
        setMoveDestinationId(null);
    };

    const handleMoveItem = async () => {
        if (activeItemId === null) return;

        // Prevent moving a folder into itself (basic check)
        if (activeItemId === moveDestinationId) return;

        const itemToMove = items.find(i => i.id === activeItemId);
        if (!itemToMove) return;

        try {
            if (itemToMove.type === "folder") {
                await apiClient.put(`/folders/${activeItemId}`, { parentId: moveDestinationId });
            } else {
                await apiClient.put(`/sheets/${activeItemId}`, { folderId: moveDestinationId });
            }
            fetchItems();
            setIsMoveModalOpen(false);
            setActiveItemId(null);
            setMoveDestinationId(null);
        } catch (error) {
            console.error("Error moving item:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to move item',
                customClass: { popup: 'rounded-2xl' }
            });
        }
    };

    const openDeleteModal = async (id) => {
        const itemToDelete = items.find(i => i.id === id);
        if (!itemToDelete) return;

        const isFolder = itemToDelete.type === "folder";

        const result = await Swal.fire({
            title: 'Delete Item?',
            text: `Are you sure you want to delete this${isFolder ? ' folder and all items inside' : ''}? This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Delete',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'rounded-xl px-5',
                cancelButton: 'rounded-xl px-5'
            }
        });

        if (!result.isConfirmed) return;

        try {
            if (isFolder) {
                await apiClient.delete(`/folders/${id}`);
            } else {
                await apiClient.delete(`/sheets/${id}`);
            }
            Swal.fire({ icon: 'success', title: 'Deleted', text: 'Item removed.', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-2xl' } });
            fetchItems();
        } catch (error) {
            console.error("Error deleting item:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete item.', customClass: { popup: 'rounded-2xl' } });
        }
    };

    const handleDuplicateItem = (id, title, type) => {
        setDuplicateItemId(id);
        setDuplicateItemName(title);
        setDuplicateItemType(type);
        setIsDuplicateModalOpen(true);
    };

    const submitDuplicateItem = async () => {
        if (!duplicateItemName.trim() || duplicateItemId === null) return;

        try {
            const endpoint = duplicateItemType === "folder" ? `/folders/${duplicateItemId}/duplicate` : `/sheets/${duplicateItemId}/duplicate`;
            await apiClient.post(endpoint, { name: duplicateItemName });
            fetchItems();
            setIsDuplicateModalOpen(false);
            setDuplicateItemId(null);
            setDuplicateItemType(null);
            setDuplicateItemName("");
        } catch (error) {
            console.error("Error duplicating item:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to duplicate item',
                customClass: { popup: 'rounded-2xl' }
            });
        }
    };

    // Sort helper — applied after filter
    const sortItems = (arr) => {
        return [...arr].sort((a, b) => {
            switch (sortOption) {
                case 'name_asc':  return a.title.localeCompare(b.title);
                case 'name_desc': return b.title.localeCompare(a.title);
                case 'date_newest': return new Date(b.rawDate) - new Date(a.rawDate);
                case 'date_oldest': return new Date(a.rawDate) - new Date(b.rawDate);
                default: return 0;
            }
        });
    };

    // Filter items for current view, then sort
    const currentFolders = sortItems(items.filter(item => {
        if (searchQuery) return item.type === "folder" && item.title.toLowerCase().includes(searchQuery.toLowerCase());
        return item.parentId === currentFolderId && item.type === "folder";
    }));
    const currentFiles = sortItems(items.filter(item => {
        if (searchQuery) return item.type === "file" && item.title.toLowerCase().includes(searchQuery.toLowerCase());
        return item.parentId === currentFolderId && item.type === "file";
    }));
    const isFolderEmpty = currentFolders.length === 0 && currentFiles.length === 0;

    const SORT_OPTIONS = [
        { key: 'name_asc',     label: 'Name A → Z' },
        { key: 'name_desc',    label: 'Name Z → A' },
        { key: 'date_newest',  label: 'Newest First' },
        { key: 'date_oldest',  label: 'Oldest First' },
    ];

    // Helper for Move Modal to get all folders except active item and its descendents
    const getValidDestinationFolders = () => {
        if (!activeItemId) return [];

        // Find all descendents of the active item to prevent circular moves
        const getDescendentIds = (id) => {
            const children = items.filter(item => item.parentId === id);
            let descIds = children.map(c => c.id);
            children.forEach(child => {
                descIds = [...descIds, ...getDescendentIds(child.id)];
            });
            return descIds;
        };

        const invalidIds = [activeItemId, ...getDescendentIds(activeItemId)];
        const validFolders = items.filter(item => item.type === "folder" && !invalidIds.includes(item.id));

        const hierarchicalFolders = [];
        const buildHierarchicalList = (parentId, depth) => {
            const children = validFolders.filter(f => f.parentId === parentId);
            children.sort((a, b) => a.title.localeCompare(b.title));
            for (const child of children) {
                hierarchicalFolders.push({ ...child, depth });
                buildHierarchicalList(child.id, depth + 1);
            }
        };

        // Root folders have parentId not in the validFolders list (or null)
        const validFolderIds = validFolders.map(f => f.id);
        const rootFolders = validFolders.filter(f => !f.parentId || !validFolderIds.includes(f.parentId));
        rootFolders.sort((a, b) => a.title.localeCompare(b.title));

        for (const root of rootFolders) {
            hierarchicalFolders.push({ ...root, depth: 1 });
            buildHierarchicalList(root.id, 2);
        }

        return hierarchicalFolders;
    };

    return (
        <main className="flex-1 min-h-screen bg-white">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Header with Breadcrumb Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
                        <button
                            className="lg:hidden p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
                            onClick={() => setMobileOpen(true)}
                        >
                            <FiMenu className="w-5 h-5" />
                        </button>

                        <div className="flex items-center text-sm">
                            {path.map((crumb, index) => (
                                <div key={index} className="flex items-center shrink-0">
                                    <button
                                        onClick={() => navigateToBreadcrumb(index)}
                                        className={`hover:underline transition-colors ${index === 0 ? 'text-gray-900 font-bold text-xl' : index === path.length - 1 ? 'text-blue-600 font-semibold text-sm' : 'text-blue-500 hover:text-blue-700 text-sm font-medium'}`}
                                    >
                                        {crumb.title}
                                    </button>
                                    {index < path.length - 1 && (
                                        <span className="mx-2 text-gray-400">/</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search file, folder ..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
                            />
                        </div>

                        {/* Sort Button */}
                        <div className="relative" ref={sortRef}>
                            <button
                                id="sort-button"
                                onClick={() => setIsSortOpen(prev => !prev)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                                    sortOption !== 'name_asc'
                                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {sortOption === 'name_asc' || sortOption === 'date_newest'
                                    ? <FiArrowUp className="w-3.5 h-3.5" />
                                    : <FiArrowDown className="w-3.5 h-3.5" />}
                                Sort
                                {sortOption !== 'name_asc' && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-0.5" />
                                )}
                            </button>

                            {isSortOpen && (
                                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20">
                                    <p className="px-3 py-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sort by</p>
                                    {SORT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.key}
                                            id={`sort-option-${opt.key}`}
                                            onClick={() => { setSortOption(opt.key); setIsSortOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                                                sortOption === opt.key
                                                    ? 'text-blue-600 bg-blue-50 font-medium'
                                                    : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {opt.label}
                                            {sortOption === opt.key && (
                                                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>



                        {/* New Document Button */}
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-2 bg-[#1A56DB] hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
                            >
                                <FiPlus className="w-4 h-4" />
                                New 
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 py-2 z-10 transition-all">
                                    <button
                                        onClick={handleCreateDocumentClick}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                                    >
                                        <FiFileText className="w-4 h-4 text-gray-400" />
                                        New Document
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsModalOpen(true);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                                    >
                                        <FiFolder className="w-4 h-4 text-blue-500" />
                                        New Folder
                                    </button>

                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center py-20 text-blue-600">
                        <svg className="animate-spin h-8 w-8 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : isFolderEmpty ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="relative mb-6">
                            <div className="w-48 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl relative">
                                <div className="absolute top-4 left-4 right-4 h-4 bg-gray-100 rounded"></div>
                                <div className="absolute top-12 left-4 w-1/2 h-4 bg-gray-100 rounded"></div>
                                <div className="absolute bottom-4 left-4 right-4 h-4 bg-gray-100 rounded"></div>
                            </div>
                            {/* Decorative stars/shapes */}
                            <FiPlus className="absolute -top-4 -left-4 w-5 h-5 text-blue-300" />
                            <FiX className="absolute -top-2 -right-6 w-4 h-4 text-blue-200" style={{ transform: 'rotate(45deg)' }} />
                            <div className="absolute -bottom-2 -left-8 w-2 h-2 rounded-full border border-blue-300"></div>
                            <div className="absolute bottom-8 -right-8 w-3 h-3 rounded-full border border-blue-200"></div>
                        </div>
                        <p className="text-gray-400 text-sm font-medium">No files or Folder created</p>
                    </div>
                ) : (
                    <>
                        {/* Folders Section */}
                        {currentFolders.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-base font-bold text-gray-800">Folders</h2>
                                    <span className="text-xs text-gray-500">{currentFolders.length} Folders</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {currentFolders.map((folder) => (
                                        <FolderCard
                                            key={folder.id}
                                            title={folder.title}
                                            date={folder.date}
                                            onClick={() => navigateToFolder(folder.id, folder.title)}
                                            onRename={() => openRenameModal(folder.id, folder.title)}
                                            onMove={() => openMoveModal(folder.id)}
                                            onShare={() => handleShareItem(folder.id, 'folder')}
                                            onDuplicate={() => handleDuplicateItem(folder.id, folder.title, "folder")}
                                            onDelete={!isStaff ? () => openDeleteModal(folder.id) : undefined}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files Section */}
                        {currentFiles.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-base font-bold text-gray-800">Files</h2>
                                    <span className="text-xs text-gray-500">{currentFiles.length} Files</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {currentFiles.map((file) => (
                                        <FileCard
                                            key={file.id}
                                            title={file.title}
                                            date={file.date}
                                            onClick={() => {
                                                setCurrentDocName(file.id);
                                                setReturnPath('/my-files');
                                                setActivePath('/document-editor');
                                            }}
                                            onRename={() => openRenameModal(file.id, file.title)}
                                            onMove={() => openMoveModal(file.id)}
                                            onShare={() => handleShareItem(file.id, 'file')}
                                            onDuplicate={() => handleDuplicateItem(file.id, file.title, "file")}
                                            onDelete={!isStaff ? () => openDeleteModal(file.id) : undefined}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>



            {/* Create Folder Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800">Create folder</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <input
                                type="text"
                                autoFocus
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New Folder"
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Document Modal */}
            {isDocModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800">New Document</h2>
                            <button
                                onClick={() => setIsDocModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500 mb-3">Please name your new document.</p>
                            <input
                                type="text"
                                autoFocus
                                value={newDocName}
                                onChange={(e) => setNewDocName(e.target.value)}
                                placeholder="Document Name"
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
                            <button
                                onClick={() => setIsDocModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateDocumentSubmit}
                                className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Folder Modal */}
            {isRenameModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800">Rename folder</h2>
                            <button
                                onClick={() => setIsRenameModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <input
                                type="text"
                                autoFocus
                                value={renameItemName}
                                onChange={(e) => setRenameItemName(e.target.value)}
                                placeholder="Name"
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
                            <button
                                onClick={() => setIsRenameModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRenameItem}
                                className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicate Modal */}
            {isDuplicateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800">
                                Duplicate {duplicateItemType === "folder" ? "Folder" : "Spreadsheet"}
                            </h2>
                            <button
                                onClick={() => setIsDuplicateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-500 mb-3">Please enter a name for the duplicate copy.</p>
                            <input
                                type="text"
                                autoFocus
                                value={duplicateItemName}
                                onChange={(e) => setDuplicateItemName(e.target.value)}
                                placeholder="Name"
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        submitDuplicateItem();
                                    }
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
                            <button
                                onClick={() => setIsDuplicateModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitDuplicateItem}
                                className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Duplicate
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Move Folder Modal */}
            {isMoveModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Move Item</h2>
                            <button
                                onClick={() => setIsMoveModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Select destination folder:</p>

                        <div className="flex-1 overflow-y-auto border border-gray-100 rounded-lg p-2 mb-4 space-y-1">
                            <button
                                onClick={() => setMoveDestinationId(null)}
                                className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors ${moveDestinationId === null ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                            >
                                <FiFolder className="w-4 h-4 text-blue-500" />
                                HOME
                            </button>
                            {getValidDestinationFolders().map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => setMoveDestinationId(folder.id)}
                                    style={{ paddingLeft: `${folder.depth * 1.25 + 0.5}rem` }}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors ${moveDestinationId === folder.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    <FiFolder className="w-4 h-4 text-blue-500 shrink-0" />
                                    <span className="truncate">{folder.title}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-auto">
                            <button
                                onClick={() => setIsMoveModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMoveItem}
                                className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                Move Here
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => {
                    setIsShareModalOpen(false);
                    setShareItemId(null);
                    setShareItemType(null);
                }}
                sheetId={shareItemType === 'file' ? shareItemId : null}
                folderId={shareItemType === 'folder' ? shareItemId : null}
            />
        </main>
    );
}

function FolderCard({ title, date, onClick, onRename, onMove, onShare, onDuplicate, onDelete }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div
            onClick={onClick}
            className="group relative flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow bg-white cursor-pointer"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <div className="shrink-0 text-blue-500">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                </div>
                <div className="overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{date}</p>
                </div>
            </div>

            {/* Three Dot Menu */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                    }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:opacity-0 lg:group-hover:opacity-100 opacity-100 transition-opacity focus:opacity-100"
                >
                    <FiMoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Options */}
                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onRename();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                            <FiEdit2 className="w-4 h-4 text-gray-400" />
                            Rename
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onShare();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                            <FiShare2 className="w-4 h-4 text-gray-400" />
                            Share
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onMove();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left border-b border-gray-100"
                        >
                            <FiMove className="w-4 h-4 text-gray-400" />
                            Move
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onDuplicate();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                            <FiPlus className="w-4 h-4 text-gray-400" />
                            Duplicate
                        </button>
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onDelete();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                            >
                                <FiTrash2 className="w-4 h-4" />
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function FileCard({ title, date, onClick, onRename, onMove, onShare, onDuplicate, onDelete }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="group relative flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow bg-white">
            <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={onClick}>
                <div className="shrink-0 text-emerald-600 bg-emerald-50 p-2 rounded-lg">
                    <BsFileEarmarkSpreadsheet className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{date}</p>
                </div>
            </div>

            {/* Three Dot Menu */}
            <div className="relative" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                    }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:opacity-0 lg:group-hover:opacity-100 opacity-100 transition-opacity focus:opacity-100"
                >
                    <FiMoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Options */}
                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onRename();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                            <FiEdit2 className="w-4 h-4 text-gray-400" />
                            Rename
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onShare();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                            <FiShare2 className="w-4 h-4 text-gray-400" />
                            Share
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onMove();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left border-b border-gray-100"
                        >
                            <FiMove className="w-4 h-4 text-gray-400" />
                            Move
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onDuplicate();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
                        >
                            <FiPlus className="w-4 h-4 text-gray-400" />
                            Duplicate
                        </button>
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsMenuOpen(false);
                                    onDelete();
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                            >
                                <FiTrash2 className="w-4 h-4" />
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
