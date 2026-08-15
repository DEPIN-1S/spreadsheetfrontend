import { useState } from "react";
import { FiFolder, FiUsers, FiShare2, FiChevronLeft, FiChevronRight, FiChevronDown, FiLogOut, FiActivity, FiAlertTriangle, FiX, FiBox } from "react-icons/fi";
import { PiPaperPlaneTiltBold } from "react-icons/pi";
import { LuFileSpreadsheet } from "react-icons/lu";
import apiClient from "../api/apiClient";
import NotificationBell from "./NotificationBell";

const navItems = [
    { name: "My Files", icon: FiFolder, path: "/my-files" },
    { name: "Shared with me", icon: FiShare2, path: "/shared" },
    { name: "Users", icon: FiUsers, path: "/users" },
    { name: "Messages", icon: PiPaperPlaneTiltBold, path: "/messages" },
    { name: "Audit Logs", icon: FiActivity, path: "/audit" },
    { 
        name: "Inventory", 
        icon: FiBox, 
        path: "/inventory",
        subItems: [
            { name: "Inventory files", path: "/inventory/files" },
            { name: "RT Billing", path: "/inventory/retail-billing" },
            { name: "WH Billing", path: "/inventory/wholesale-billing" },
            { name: "Invoice List", path: "/inventory/invoice-list" },
            { name: "Transaction History", path: "/inventory/transaction-history" },
            { name: "Downloads", path: "/downloads/transactions" },
            { name: "Ledger", path: "/inventory/ledger" }
        ]
    },
];



export default function Sidebar({ isCollapsed, toggleCollapse, mobileOpen, setMobileOpen, activePath, setActivePath }) {
    const [user] = useState(() => {
        try {
            const storedUser = localStorage.getItem("user");
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            console.error("Failed to parse user from local storage");
            return null;
        }
    });
    const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);
    const [inventoryExpanded, setInventoryExpanded] = useState(() => {
        return activePath.startsWith("/inventory");
    });

    const handleItemClick = (item) => {
        if (item.subItems) {
            setInventoryExpanded(prev => !prev);
            if (isCollapsed) {
                toggleCollapse();
            }
        } else {
            setActivePath(item.path);
        }
    };

    const handleLogout = () => {
        setShowLogoutPrompt(true);
    };

    const performLogout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await apiClient.post('/user/logout', { refreshToken });
            }
        } catch { /* ignore — clear storage regardless */ }
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setActivePath('/login');
        setShowLogoutPrompt(false);
    };

    const userName = user?.name || "Guest";
    const userRole = user?.role || "User";
    const userInitial = userName.charAt(0).toUpperCase();
    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-screen bg-[#0F172A] text-white transition-all duration-300 ease-in-out z-50
                    ${isCollapsed ? "w-20" : "w-64"}
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                <div className="flex flex-col h-full">

                    {/* Logo */}
                    <div className={`p-6 flex items-center ${isCollapsed ? "justify-center px-2" : "gap-4"}`}>
                        <div className="h-10 w-10 rounded-full bg-teal-500 flex items-center justify-center shrink-0 text-white">
                            <LuFileSpreadsheet size={20} />
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                            <h1 className="font-bold text-lg whitespace-nowrap">Datsheets</h1>
                            <p className="text-xs text-gray-400 whitespace-nowrap">Enterprise Desk</p>
                        </div>
                    </div>

                    {/* User profile */}
                    <div className={`mx-4 mb-6 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center px-2" : "gap-3"}`}>
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 border-2 border-indigo-500 text-sm font-semibold uppercase text-white">
                            {userInitial}
                        </div>
                        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                            <h3 className="text-sm font-medium whitespace-nowrap text-white">{userName}</h3>
                            <p className="text-xs text-gray-400 whitespace-nowrap capitalize">{userRole}</p>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 space-y-2">
                        {navItems
                            .filter(item => {
                                const isSuperOrAdmin = user?.role === 'admin' || user?.role === 'superadmin';
                                const isSuperadmin = user?.role === 'superadmin';
                                if (item.name === "Users" && !isSuperOrAdmin) {
                                    return false;
                                }
                                if (item.name === "Audit Logs" && !isSuperadmin) {
                                    return false;
                                }
                                return true;
                            })
                            .map((item) => {
                            const isSuperOrAdmin = user?.role === 'admin' || user?.role === 'superadmin';
                            const visibleSubItems = item.subItems ? item.subItems.filter(subItem => {
                                if ((subItem.name === "Downloads" || subItem.name === "Ledger") && !isSuperOrAdmin) {
                                    return false;
                                }
                                return true;
                            }) : null;

                            const isExactActive = activePath === item.path;
                            const isSubActive = visibleSubItems && visibleSubItems.some(sub => activePath === sub.path);
                            const isActive = isExactActive || isSubActive;
                            const hasSubItems = visibleSubItems && visibleSubItems.length > 0;
                            const isExpanded = item.name === "Inventory" ? inventoryExpanded : false;
                            
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        onClick={() => handleItemClick(item)}
                                        title={isCollapsed ? item.name : ""}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group cursor-pointer
                                            ${isExactActive
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                                                : isSubActive
                                                    ? "bg-white/5 text-indigo-400 border border-white/5"
                                                    : "text-gray-400 hover:bg-white/5 hover:text-white"}
                                            ${isCollapsed ? "justify-center px-2" : "gap-3"}
                                        `}
                                    >
                                        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                                            <item.icon size={20} className={`shrink-0 ${isActive ? "text-indigo-400" : "group-hover:text-white"}`} />
                                            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                                                {item.name}
                                            </span>
                                        </div>
                                        {!isCollapsed && hasSubItems && (
                                            <span className="text-gray-400 group-hover:text-white transition-colors">
                                                {isExpanded ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                                            </span>
                                        )}
                                    </button>
                                    
                                    {hasSubItems && isExpanded && !isCollapsed && (
                                        <div className="relative pl-5 ml-6 py-1 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                            {/* Vertical line indicator */}
                                            <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-white/10 rounded-full" />
                                            
                                            {visibleSubItems.map((subItem) => {
                                                const isSubItemActive = activePath === subItem.path;
                                                return (
                                                    <button
                                                        key={subItem.name}
                                                        onClick={() => setActivePath(subItem.path)}
                                                        className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg text-xs transition-all duration-200 cursor-pointer group/sub relative
                                                            ${isSubItemActive
                                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 font-semibold"
                                                                : "text-gray-400 hover:text-white hover:bg-white/5"}
                                                        `}
                                                    >
                                                        {/* Dot connector */}
                                                        <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 shrink-0
                                                            ${isSubItemActive 
                                                                ? "bg-white ring-4 ring-white/20 scale-110" 
                                                                : "bg-gray-600 group-hover/sub:bg-white"}
                                                         `} />
                                                        
                                                        {/* Text with slight offset translation */}
                                                        <span className="whitespace-nowrap transition-transform duration-200 group-hover/sub:translate-x-0.5">
                                                            {subItem.name}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5 space-y-2">
                        {user && user.role !== 'admin' && (
                            <NotificationBell isCollapsed={isCollapsed} />
                        )}
                        <button
                            onClick={toggleCollapse}
                            className={`hidden lg:flex w-full items-center p-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all
                                ${isCollapsed ? "justify-center px-2" : "gap-3"}
                            `}
                        >
                            {isCollapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
                            <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                                Collapse
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all
                                ${isCollapsed ? "justify-center px-2" : "gap-3"}
                            `}
                        >
                            <FiLogOut size={20} />
                            <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"}`}>
                                Logout
                            </span>
                        </button>
                    </div>
                </div>
            </aside>

            <LogoutModal 
                isOpen={showLogoutPrompt} 
                onClose={() => setShowLogoutPrompt(false)} 
                onConfirm={performLogout} 
            />
        </>
    );
}

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
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
                        <FiAlertTriangle className="w-8 h-8 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">Logout</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Are you sure you want to log out? <br /> You'll need to sign in again to access your spreadsheets.
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
                            <FiLogOut className="w-4 h-4" />
                            Log Out
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
