import { useState, useEffect, useCallback } from "react";
import { FiSearch, FiMenu, FiFolder, FiPlus, FiChevronRight, FiMove, FiTrash2 } from "react-icons/fi";
import { BsFileEarmarkSpreadsheet } from "react-icons/bs";
import apiClient from "../api/apiClient";
import Swal from "sweetalert2";

export default function SharedWithMe({ setMobileOpen, setActivePath, setCurrentDocName, setReturnPath }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState(null); // virtual folder id
    const [breadcrumb, setBreadcrumb] = useState([]);

    // UI state
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
    const [movingItem, setMovingItem] = useState(null);
    const [allSharedFolders, setAllSharedFolders] = useState([]);

    const fetchSharedItems = useCallback(async () => {
        setLoading(true);
        try {
            const params = { folderId: currentFolderId || "root" };
            const response = await apiClient.get('/sheets/shared', { params });
            
            const fetchedFiles = (response.data.data?.files || []).map(sheet => ({
                id: sheet.id,
                type: "file",
                title: sheet.name,
                date: new Date(sheet.sharedAt || sheet.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                sharedBy: sheet.sharedBy,
                fileType: "doc",
                role: sheet.permissionRole,
                virtualFolderId: sheet.virtualFolderId
            }));
            
            const fetchedFolders = (response.data.data?.folders || []).map(folder => ({
                id: folder.id,
                type: "folder",
                title: folder.name,
                date: new Date(folder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                createdBy: folder.createdBy
            }));
            
            setFiles(fetchedFiles);
            setFolders(fetchedFolders);
        } catch (error) {
            console.error("Error fetching shared items:", error);
        } finally {
            setLoading(false);
        }
    }, [currentFolderId]);

    const fetchAllSharedFolders = async () => {
        try {
            const response = await apiClient.get('/folders');
            const fetchedFolders = [];

            const flattenSharedFolders = (folderNodes) => {
                for (const node of folderNodes) {
                    if (node.category === 'shared_org') {
                        fetchedFolders.push({
                            id: node.id,
                            name: node.name,
                            parentId: node.parentId
                        });
                    }
                    if (node.children && node.children.length > 0) {
                        flattenSharedFolders(node.children);
                    }
                }
            };

            if (response.data && response.data.data) {
                flattenSharedFolders(response.data.data);
            }

            const hierarchicalFolders = [];
            const buildHierarchicalList = (parentId, depth) => {
                const children = fetchedFolders.filter(f => f.parentId === parentId);
                children.sort((a, b) => a.name.localeCompare(b.name));
                for (const child of children) {
                    hierarchicalFolders.push({ ...child, depth });
                    buildHierarchicalList(child.id, depth + 1);
                }
            };

            const folderIds = fetchedFolders.map(f => f.id);
            const rootFolders = fetchedFolders.filter(f => !f.parentId || !folderIds.includes(f.parentId));
            rootFolders.sort((a, b) => a.name.localeCompare(b.name));

            for (const root of rootFolders) {
                hierarchicalFolders.push({ ...root, depth: 1 });
                buildHierarchicalList(root.id, 2);
            }

            setAllSharedFolders(hierarchicalFolders);
        } catch (error) {
            console.error("Error fetching move folders:", error);
        }
    };

    useEffect(() => {
        fetchSharedItems();
    }, [fetchSharedItems]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        try {
            await apiClient.post('/folders', {
                name: newFolderName,
                parentId: currentFolderId,
                category: 'shared_org'
            });
            fetchSharedItems();
            setNewFolderName("");
            setIsCreateFolderModalOpen(false);
        } catch (error) {
            Swal.fire("Error", error.response?.data?.message || "Failed to create folder", "error");
        }
    };

    const openDeleteModal = async (id, type) => {
        const isFolder = type === "folder";
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
            fetchSharedItems();
        } catch (error) {
            console.error("Error deleting item:", error);
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'Failed to delete item.', customClass: { popup: 'rounded-2xl' } });
        }
    };



    const handleMoveItem = async (targetFolderId) => {
        if (!movingItem) return;
        try {
            await apiClient.patch(`/sheets/${movingItem.id}/move-shared`, {
                folderId: targetFolderId
            });
            fetchSharedItems();
            setIsMoveModalOpen(false);
            setMovingItem(null);
            Swal.fire("Success", "File moved successfully", "success");
        } catch (error) {
            Swal.fire("Error", error.response?.data?.message || "Failed to move file", "error");
        }
    };

    const navigateToFolder = (folder) => {
        setCurrentFolderId(folder.id);
        setBreadcrumb([...breadcrumb, folder]);
    };

    const navigateToBreadcrumb = (index) => {
        if (index === -1) {
            setCurrentFolderId(null);
            setBreadcrumb([]);
        } else {
            const newBreadcrumb = breadcrumb.slice(0, index + 1);
            setBreadcrumb(newBreadcrumb);
            setCurrentFolderId(newBreadcrumb[newBreadcrumb.length - 1].id);
        }
    };

    const filteredFolders = folders.filter(f => f.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredFiles = files.filter(f => 
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.sharedBy?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isEmpty = !loading && filteredFolders.length === 0 && filteredFiles.length === 0;

    return (
        <main className="flex-1 min-h-screen bg-white">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2">
                        <button
                            className="lg:hidden p-2 -ml-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0"
                            onClick={() => setMobileOpen(true)}
                        >
                            <FiMenu className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900">Shared with me</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search shared items..."
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64 shadow-xs"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setNewFolderName("");
                                setIsCreateFolderModalOpen(true);
                            }}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-md shadow-indigo-100 active:scale-95"
                        >
                            <FiPlus className="w-4 h-4" /> New Folder
                        </button>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide text-sm">
                    <button 
                        onClick={() => navigateToBreadcrumb(-1)}
                        className={`hover:text-indigo-600 transition-colors ${currentFolderId === null ? 'text-indigo-600 font-bold' : 'text-gray-500'}`}
                    >
                        Shared Root
                    </button>
                    {breadcrumb.map((b, i) => (
                        <div key={b.id} className="flex items-center gap-2 shrink-0">
                            <FiChevronRight className="w-4 h-4 text-gray-400" />
                            <button 
                                onClick={() => navigateToBreadcrumb(i)}
                                className={`hover:text-indigo-600 transition-colors ${i === breadcrumb.length - 1 ? 'text-indigo-600 font-bold' : 'text-gray-500'}`}
                            >
                                {b.title}
                            </button>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : isEmpty ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <FiSearch className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No shared items found</h3>
                        <p className="text-gray-500 text-sm">Organize documents shared with you here.</p>
                    </div>
                ) : (
                    <>
                        {/* Folders Section */}
                        {filteredFolders.length > 0 && (
                            <div className="mb-10">
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Folders</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredFolders.map((folder) => (
                                        <div 
                                            key={folder.id} 
                                            onClick={() => navigateToFolder(folder)}
                                            className="group flex flex-col p-4 border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/50 transition-all bg-white cursor-pointer relative"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                                    <FiFolder className="w-6 h-6 fill-indigo-500/20" />
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openDeleteModal(folder.id, 'folder');
                                                    }}
                                                    className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all lg:opacity-0 lg:group-hover:opacity-100 opacity-100 focus:opacity-100 shrink-0"
                                                    title="Delete Folder"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <h3 className="text-sm font-semibold text-gray-800 truncate mb-1" title={folder.title}>{folder.title}</h3>
                                            <p className="text-[11px] text-gray-400">Organization Folder</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Files Section */}
                        {filteredFiles.length > 0 && (
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Files</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredFiles.map((file) => (
                                        <div 
                                            key={file.id} 
                                            className="group flex flex-col p-4 border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50/50 transition-all bg-white relative"
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div 
                                                    onClick={() => {
                                                        setCurrentDocName(file.id);
                                                        setReturnPath('/shared');
                                                        setActivePath('/document-editor');
                                                    }}
                                                    className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform cursor-pointer"
                                                >
                                                    <BsFileEarmarkSpreadsheet className="w-6 h-6" />
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button 
                                                        onClick={() => {
                                                            setMovingItem(file);
                                                            fetchAllSharedFolders();
                                                            setIsMoveModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Move to folder"
                                                    >
                                                        <FiMove className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => openDeleteModal(file.id, 'file')}
                                                        className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete File"
                                                    >
                                                        <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <h3 
                                                onClick={() => {
                                                    setCurrentDocName(file.id);
                                                    setReturnPath('/shared');
                                                    setActivePath('/document-editor');
                                                }}
                                                className="text-sm font-semibold text-gray-800 truncate mb-2 cursor-pointer hover:text-indigo-600" 
                                                title={file.title}
                                            >
                                                {file.title}
                                            </h3>

                                            <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-700 uppercase shrink-0">
                                                        {file.sharedBy?.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-medium text-gray-700 truncate">{file.sharedBy?.name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter font-semibold">{file.sharedBy?.role}</p>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded-md shrink-0">
                                                    {file.date}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Folder Modal */}
            {isCreateFolderModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <FiFolder className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">New Virtual Folder</h2>
                        </div>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6 bg-gray-50"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsCreateFolderModalOpen(false)}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleCreateFolder}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-100"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Move Modal */}
            {isMoveModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <FiMove className="text-indigo-600" /> Move to Folder
                        </h2>
                        <div className="max-h-60 overflow-y-auto mb-6 space-y-2 pr-2">
                            <button 
                                onClick={() => handleMoveItem(null)}
                                className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl transition-colors text-sm flex items-center gap-3 font-medium text-gray-600"
                            >
                                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">/</div>
                                Shared Root
                            </button>
                            {allSharedFolders.map(f => (
                                <button 
                                    key={f.id}
                                    onClick={() => handleMoveItem(f.id)}
                                    style={{ paddingLeft: `${f.depth * 1.25 + 0.75}rem` }}
                                    className="w-full text-left p-3 hover:bg-indigo-50 rounded-xl transition-colors text-sm flex items-center gap-3 font-medium text-gray-600"
                                >
                                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500 shrink-0">
                                        <FiFolder className="w-4 h-4" />
                                    </div>
                                    <span className="truncate">{f.name}</span>
                                </button>
                            ))}
                        </div>
                        <button 
                            onClick={() => setIsMoveModalOpen(false)}
                            className="w-full px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
