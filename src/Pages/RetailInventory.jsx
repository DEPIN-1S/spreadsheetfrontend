import { useState, useRef, useEffect } from "react";
import { 
    FiMenu, FiSearch, FiPlus, FiX, FiInfo, FiFolder, FiMoreVertical, 
    FiEdit2, FiTrash2, FiChevronRight, FiArrowUp, FiArrowDown, FiFileText,
    FiMove
} from "react-icons/fi";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import Swal from "sweetalert2";
import { invFoldersApi, invSheetsApi } from "../api/inventoryApiClient";

export default function RetailInventory({ setMobileOpen, setActivePath, setCurrentDocName, setReturnPath }) {
    const [path, setPath] = useState([{ id: null, title: "Inventory files" }]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState("name_asc");
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef(null);
    
    // Dropdown and Modal states
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    
    // Active item tracking
    const [activeItemId, setActiveItemId] = useState(null);
    const [activeItemType, setActiveItemType] = useState(null); // 'folder' | 'file'
    const [renameItemName, setRenameItemName] = useState("");
    const [moveDestinationId, setMoveDestinationId] = useState(null);
    const [duplicateItemId, setDuplicateItemId] = useState(null);
    const [duplicateItemType, setDuplicateItemType] = useState(null);
    const [duplicateItemName, setDuplicateItemName] = useState("");

    // Forms
    const [newFolderName, setNewFolderName] = useState("");
    const [newDocName, setNewDocName] = useState("");

    const [folders, setFolders] = useState([]);
    const [retailItems, setRetailItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentFolderId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const folderRes = await invFoldersApi.list(currentFolderId || undefined);
            setFolders(folderRes.data.data || []);

            const sheetRes = await invSheetsApi.list(currentFolderId || undefined);
            setRetailItems(sheetRes.data.data || []);
        } catch (error) {
            console.error("Failed to load inventory:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    // Close sort dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Navigation handlers
    const navigateToFolder = (folderId, folderTitle) => {
        setCurrentFolderId(folderId);
        setPath([...path, { id: folderId, title: folderTitle }]);
    };

    const navigateToBreadcrumb = (index) => {
        const newPath = path.slice(0, index + 1);
        setPath(newPath);
        const lastFolder = newPath.at(-1);
        setCurrentFolderId(lastFolder ? lastFolder.id : null);
    };

    // Create folder
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await invFoldersApi.create({
                title: newFolderName.trim(),
                parentId: currentFolderId
            });
            setNewFolderName("");
            setIsFolderModalOpen(false);
            loadData();

            Swal.fire({
                icon: "success",
                title: "Folder Created",
                text: "Successfully created folder in inventory.",
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: "rounded-2xl" }
            });
        } catch (error) {
            console.error("Failed to create folder:", error);
        }
    };

    // Create document SKU
    const handleAddProductSubmit = async (e) => {
        e.preventDefault();
        if (!newDocName.trim()) return;

        try {
            const sku = `INV-SKU-${Math.floor(1000 + Math.random() * 9000)}`;
            await invSheetsApi.create({
                name: newDocName.trim(),
                sku,
                folderId: currentFolderId
            });
            setIsProductModalOpen(false);
            setNewDocName("");
            loadData();

            Swal.fire({
                icon: "success",
                title: "Document Created",
                text: "Successfully created new inventory document.",
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: "rounded-2xl" }
            });
        } catch (error) {
            console.error("Failed to create document:", error);
        }
    };

    const handleDeleteFolder = (id) => {
        Swal.fire({
            title: "Delete Folder?",
            text: "Are you sure you want to delete this folder? This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Yes, delete",
            customClass: { popup: "rounded-2xl" }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await invFoldersApi.delete(id);
                    loadData();
                    Swal.fire({
                        icon: "success",
                        title: "Deleted",
                        text: "Folder removed.",
                        timer: 1500,
                        showConfirmButton: false,
                        customClass: { popup: "rounded-2xl" }
                    });
                } catch (error) {
                    console.error("Failed to delete folder:", error);
                }
            }
        });
    };

    const handleDeleteProduct = (id) => {
        Swal.fire({
            title: "Delete Document?",
            text: "Are you sure you want to remove this document from inventory? This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            confirmButtonText: "Yes, delete",
            customClass: { popup: "rounded-2xl" }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await invSheetsApi.delete(id);
                    loadData();
                    Swal.fire({
                        icon: "success",
                        title: "Deleted",
                        text: "Document removed.",
                        timer: 1500,
                        showConfirmButton: false,
                        customClass: { popup: "rounded-2xl" }
                    });
                } catch (error) {
                    console.error("Failed to delete sheet:", error);
                }
            }
        });
    };

    // Rename Triggers
    const openRenameModal = (id, currentTitle, type) => {
        setActiveItemId(id);
        setActiveItemType(type);
        setRenameItemName(currentTitle);
        setIsRenameModalOpen(true);
    };

    const handleRenameItem = async () => {
        if (!renameItemName.trim() || activeItemId === null) return;

        try {
            if (activeItemType === "folder") {
                await invFoldersApi.update(activeItemId, { title: renameItemName.trim() });
            } else {
                await invSheetsApi.update(activeItemId, { name: renameItemName.trim() });
            }
            setIsRenameModalOpen(false);
            setActiveItemId(null);
            setActiveItemType(null);
            setRenameItemName("");
            loadData();

            Swal.fire({
                icon: "success",
                title: "Renamed",
                text: "Successfully renamed item.",
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: "rounded-2xl" }
            });
        } catch (error) {
            console.error("Failed to rename item:", error);
        }
    };

    // Move Triggers
    const openMoveModal = (id, type) => {
        setActiveItemId(id);
        setActiveItemType(type);
        setMoveDestinationId(null);
        setIsMoveModalOpen(true);
    };

    const handleMoveItem = async () => {
        if (activeItemId === null) return;

        try {
            if (activeItemType === "folder") {
                if (activeItemId === moveDestinationId) return;
                await invFoldersApi.update(activeItemId, { parentId: moveDestinationId });
            } else {
                await invSheetsApi.update(activeItemId, { folderId: moveDestinationId });
            }
            setIsMoveModalOpen(false);
            setActiveItemId(null);
            setActiveItemType(null);
            setMoveDestinationId(null);
            loadData();

            Swal.fire({
                icon: "success",
                title: "Moved",
                text: "Successfully moved item.",
                timer: 1500,
                showConfirmButton: false,
                customClass: { popup: "rounded-2xl" }
            });
        } catch (error) {
            console.error("Failed to move item:", error);
        }
    };

    // Duplicate Triggers
    const handleDuplicateItem = (id, title, type) => {
        setDuplicateItemId(id);
        setDuplicateItemType(type);
        setDuplicateItemName(title + " (Copy)");
        setIsDuplicateModalOpen(true);
    };

    const submitDuplicateItem = () => {
        if (!duplicateItemName.trim() || duplicateItemId === null) return;

        if (duplicateItemType === "folder") {
            const sourceFolder = folders.find(f => f.id === duplicateItemId);
            if (!sourceFolder) return;
            const newId = folders.length > 0 ? Math.max(...folders.map(f => f.id)) + 1 : 1;
            const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            const newFolder = {
                id: newId,
                title: duplicateItemName,
                date: today,
                parentId: sourceFolder.parentId
            };
            setFolders([...folders, newFolder]);
        } else {
            const sourceFile = retailItems.find(f => f.id === duplicateItemId);
            if (!sourceFile) return;
            const newId = `mock-inventory-${Date.now()}`;
            const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            const newFile = {
                id: newId,
                name: duplicateItemName,
                sku: `INV-SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                parentId: sourceFile.parentId,
                date: today
            };
            const savedData = localStorage.getItem(`sheet_data_${duplicateItemId}`);
            if (savedData) {
                localStorage.setItem(`sheet_data_${newId}`, savedData);
            }
            setRetailItems([newFile, ...retailItems]);
        }

        setIsDuplicateModalOpen(false);
        setDuplicateItemId(null);
        setDuplicateItemType(null);
        setDuplicateItemName("");

        Swal.fire({
            icon: "success",
            title: "Duplicated",
            text: "Successfully duplicated item.",
            timer: 1500,
            showConfirmButton: false,
            customClass: { popup: "rounded-2xl" }
        });
    };

    // Helper for destination folders in move modal
    const getValidDestinationFolders = () => {
        if (!activeItemId) return [];

        const isFolder = activeItemType === "folder";

        const getDescendentIds = (id) => {
            const children = folders.filter(item => item.parentId === id);
            let descIds = children.map(c => c.id);
            children.forEach(child => {
                descIds = [...descIds, ...getDescendentIds(child.id)];
            });
            return descIds;
        };

        const invalidIds = isFolder ? [activeItemId, ...getDescendentIds(activeItemId)] : [];
        const validFolders = folders.filter(item => !invalidIds.includes(item.id));

        const hierarchicalFolders = [];
        const buildHierarchicalList = (parentId, depth) => {
            const children = validFolders.filter(f => f.parentId === parentId);
            children.sort((a, b) => a.title.localeCompare(b.title));
            for (const child of children) {
                hierarchicalFolders.push({ ...child, depth });
                buildHierarchicalList(child.id, depth + 1);
            }
        };

        const validFolderIds = validFolders.map(f => f.id);
        const rootFolders = validFolders.filter(f => !f.parentId || !validFolderIds.includes(f.parentId));
        rootFolders.sort((a, b) => a.title.localeCompare(b.title));

        for (const root of rootFolders) {
            hierarchicalFolders.push({ ...root, depth: 1 });
            buildHierarchicalList(root.id, 2);
        }

        return hierarchicalFolders;
    };

    // Filtering & Sorting
    const parseMockDate = (dateStr) => {
        if (!dateStr) return new Date(0);
        return new Date(dateStr);
    };

    const sortItems = (arr) => {
        return [...arr].sort((a, b) => {
            const nameA = a.title || a.name || "";
            const nameB = b.title || b.name || "";
            switch (sortOption) {
                case "name_asc":  return nameA.localeCompare(nameB);
                case "name_desc": return nameB.localeCompare(nameA);
                case "date_newest": return parseMockDate(b.date) - parseMockDate(a.date);
                case "date_oldest": return parseMockDate(a.date) - parseMockDate(b.date);
                default: return 0;
            }
        });
    };

    const filteredFolders = folders.filter(f => {
        const matchesParent = f.parentId === currentFolderId;
        const matchesSearch = f.title.toLowerCase().includes(searchQuery.toLowerCase());
        return searchQuery ? matchesSearch : matchesParent;
    });

    const filteredFiles = retailItems.filter(f => {
        const matchesParent = f.parentId === currentFolderId || f.folderId === currentFolderId;
        const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
        return searchQuery ? matchesSearch : matchesParent;
    });

    const sortedFolders = sortItems(filteredFolders);
    const sortedFiles = sortItems(filteredFiles);

    const isViewEmpty = sortedFolders.length === 0 && sortedFiles.length === 0;

    const SORT_OPTIONS = [
        { key: "name_asc",     label: "Name A → Z" },
        { key: "name_desc",    label: "Name Z → A" },
        { key: "date_newest",  label: "Newest First" },
        { key: "date_oldest",  label: "Oldest First" },
    ];

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
                                        className={`hover:underline transition-colors ${
                                            index === 0 
                                                ? "text-gray-900 font-bold text-xl" 
                                                : index === path.length - 1 
                                                    ? "text-blue-600 font-semibold text-sm" 
                                                    : "text-blue-500 hover:text-blue-700 text-sm font-medium"
                                        }`}
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

                        {/* Sort Button & Dropdown */}
                        <div className="relative" ref={sortRef}>
                            <button
                                id="sort-button"
                                onClick={() => setIsSortOpen(prev => !prev)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                                    sortOption !== "name_asc"
                                        ? "bg-blue-50 border-blue-300 text-blue-700"
                                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                                }`}
                            >
                                {sortOption === "name_asc" || sortOption === "date_newest"
                                    ? <FiArrowUp className="w-3.5 h-3.5" />
                                    : <FiArrowDown className="w-3.5 h-3.5" />}
                                Sort
                                {sortOption !== "name_asc" && (
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
                                            className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                                                sortOption === opt.key
                                                    ? "text-blue-600 bg-blue-50 font-medium"
                                                    : "text-gray-700 hover:bg-gray-50"
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

                        {/* + New Button */}
                        <div className="relative">
                            <button
                                onClick={() => setIsDropdownOpen(prev => !prev)}
                                className="flex items-center gap-2 bg-[#1A56DB] hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer"
                            >
                                <FiPlus className="w-4 h-4" />
                                New
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-30">
                                    <button
                                        onClick={() => {
                                            setIsProductModalOpen(true);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                                    >
                                        <FiFileText className="w-4 h-4 text-gray-400" />
                                        New inventory document
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsFolderModalOpen(true);
                                            setIsDropdownOpen(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                                    >
                                        <FiFolder className="w-4 h-4 text-blue-500" />
                                        New folder
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                {isViewEmpty ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="relative mb-6">
                            <div className="w-48 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl relative">
                                <div className="absolute top-4 left-4 right-4 h-4 bg-gray-100 rounded"></div>
                                <div className="absolute top-12 left-4 w-1/2 h-4 bg-gray-100 rounded"></div>
                                <div className="absolute bottom-4 left-4 right-4 h-4 bg-gray-100 rounded"></div>
                            </div>
                            <FiPlus className="absolute -top-4 -left-4 w-5 h-5 text-blue-300" />
                            <FiX className="absolute -top-2 -right-6 w-4 h-4 text-blue-200" style={{ transform: "rotate(45deg)" }} />
                            <div className="absolute -bottom-2 -left-8 w-2 h-2 rounded-full border border-blue-300"></div>
                            <div className="absolute bottom-8 -right-8 w-3 h-3 rounded-full border border-blue-200"></div>
                        </div>
                        <p className="text-gray-400 text-sm font-medium">No files or Folder created</p>
                    </div>
                ) : (
                    <>
                        {/* Folders List */}
                        {sortedFolders.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-base font-bold text-gray-800">Folders</h2>
                                    <span className="text-xs text-gray-500">{sortedFolders.length} Folders</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {sortedFolders.map((folder) => (
                                        <FolderCard
                                            key={folder.id}
                                            title={folder.title}
                                            date={folder.date}
                                            onClick={() => navigateToFolder(folder.id, folder.title)}
                                            onRename={() => openRenameModal(folder.id, folder.title, "folder")}
                                            onMove={() => openMoveModal(folder.id, "folder")}
                                            onDuplicate={() => handleDuplicateItem(folder.id, folder.title, "folder")}
                                            onDelete={() => handleDeleteFolder(folder.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files/Products List */}
                        {sortedFiles.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <h2 className="text-base font-bold text-gray-800">Files</h2>
                                    <span className="text-xs text-gray-500">{sortedFiles.length} Files</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {sortedFiles.map((file) => (
                                        <FileCard
                                            key={file.id}
                                            title={file.name}
                                            date={file.date}
                                            onClick={() => {
                                                setCurrentDocName(file.id);
                                                setReturnPath("/inventory/files");
                                                setActivePath("/inventory-document-editor");
                                            }}
                                            onRename={() => openRenameModal(file.id, file.name, "file")}
                                            onMove={() => openMoveModal(file.id, "file")}
                                            onDuplicate={() => handleDuplicateItem(file.id, file.name, "file")}
                                            onDelete={() => handleDeleteProduct(file.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Folder Modal */}
            {isFolderModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsFolderModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800">Create folder</h2>
                            <button
                                onClick={() => setIsFolderModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder}>
                            <div className="p-4">
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="New Folder"
                                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsFolderModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add SKU Product Modal (New Inventory Document) */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsProductModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800">New inventory document</h2>
                            <button
                                onClick={() => setIsProductModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddProductSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Document Name</label>
                                <input 
                                    type="text" 
                                    required
                                    autoFocus
                                    value={newDocName}
                                    onChange={(e) => setNewDocName(e.target.value)}
                                    placeholder="e.g. Sales Report Q2"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button 
                                    type="button"
                                    onClick={() => setIsProductModalOpen(false)}
                                    className="flex-1 py-2.5 px-4 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 py-2.5 px-4 bg-[#1A56DB] hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm cursor-pointer"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rename Modal */}
            {isRenameModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsRenameModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-800">Rename {activeItemType === "folder" ? "folder" : "document"}</h2>
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
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                onKeyDown={(e) => e.key === "Enter" && handleRenameItem()}
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
                                className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Duplicate Modal */}
            {isDuplicateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsDuplicateModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
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
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
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
                                className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                            >
                                Duplicate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move Folder/File Modal */}
            {isMoveModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsMoveModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden p-6 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                                className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${moveDestinationId === null ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                            >
                                <FiFolder className="w-4 h-4 text-blue-500" />
                                HOME (Inventory files)
                            </button>
                            {getValidDestinationFolders().map(folder => (
                                <button
                                    key={folder.id}
                                    onClick={() => setMoveDestinationId(folder.id)}
                                    style={{ paddingLeft: `${folder.depth * 1.25 + 0.5}rem` }}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-sm text-left transition-colors cursor-pointer ${moveDestinationId === folder.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
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
                                className="px-5 py-2 text-sm font-medium bg-[#1A56DB] hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                            >
                                Move Here
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
}

// Folder Card helper component
function FolderCard({ title, date, onClick, onRename, onMove, onDuplicate, onDelete }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
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

            <div className="relative" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                    }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:opacity-0 lg:group-hover:opacity-100 opacity-100 transition-opacity focus:opacity-100 cursor-pointer"
                >
                    <FiMoreVertical className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onRename();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer"
                        >
                            <FiEdit2 className="w-4 h-4 text-gray-400" />
                            Rename
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onMove();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left border-b border-gray-100 cursor-pointer"
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
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer"
                        >
                            <FiPlus className="w-4 h-4 text-gray-400" />
                            Duplicate
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onDelete();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left cursor-pointer"
                        >
                            <FiTrash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// File Card helper component
function FileCard({ title, date, onClick, onRename, onMove, onDuplicate, onDelete }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
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
                <div className="overflow-hidden">
                    <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{date}</p>
                </div>
            </div>

            <div className="relative" ref={menuRef}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(!isMenuOpen);
                    }}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:opacity-0 lg:group-hover:opacity-100 opacity-100 transition-opacity focus:opacity-100 cursor-pointer"
                >
                    <FiMoreVertical className="w-5 h-5" />
                </button>

                {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onRename();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer"
                        >
                            <FiEdit2 className="w-4 h-4 text-gray-400" />
                            Rename
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onMove();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left border-b border-gray-100 cursor-pointer"
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
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left cursor-pointer"
                        >
                            <FiPlus className="w-4 h-4 text-gray-400" />
                            Duplicate
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMenuOpen(false);
                                onDelete();
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left cursor-pointer"
                        >
                            <FiTrash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
