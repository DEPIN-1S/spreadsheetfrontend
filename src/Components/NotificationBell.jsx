import { useState, useEffect, useRef } from "react";
import { FiBell, FiCheck, FiX, FiAlertTriangle, FiAlertCircle, FiDollarSign, FiClock, FiUser, FiPhone } from "react-icons/fi";
import axios from "axios";

// Using the common base url from apiClient
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:6041/api';

export default function NotificationBell({ isCollapsed }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("billing"); // 'stock' or 'billing'
    const [stockNotifs, setStockNotifs] = useState([]);
    const [billingNotifs, setBillingNotifs] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    const getHeaders = () => {
        const token = localStorage.getItem("accessToken");
        return {
            headers: {
                Authorization: token ? `Bearer ${token}` : ""
            }
        };
    };

    const fetchNotifications = async () => {
        try {
            const listRes = await axios.get(`${BASE_URL}/inv/notifications?isRead=false`, getHeaders());
            const rawNotifs = listRes.data.data || [];
            
            const stocks = rawNotifs.filter(n => n.type === 'out_of_stock' || n.type === 'low_stock');
            const billings = rawNotifs.filter(n => n.type === 'pending_payment_alert');
            
            setStockNotifs(stocks);
            setBillingNotifs(billings);
            setUnreadCount(rawNotifs.length);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.patch(`${BASE_URL}/inv/notifications/${id}/read`, {}, getHeaders());
            fetchNotifications();
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const dismissNotification = async (id) => {
        try {
            await axios.patch(`${BASE_URL}/inv/notifications/${id}/dismiss`, {}, getHeaders());
            fetchNotifications();
        } catch (error) {
            console.error("Error dismissing notification:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.patch(`${BASE_URL}/inv/notifications/read-all`, {}, getHeaders());
            fetchNotifications();
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const currentNotifs = activeTab === "billing" ? billingNotifs : stockNotifs;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative w-full flex items-center p-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-200 cursor-pointer ${isCollapsed ? "justify-center px-2" : "gap-3"}`}
            >
                <div className="relative shrink-0 flex items-center justify-center">
                    <FiBell size={20} className={unreadCount > 0 ? "animate-swing origin-top" : ""} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-[#0F172A]">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {!isCollapsed && (
                    <span className="font-medium text-sm whitespace-nowrap flex-1 text-left">Notifications</span>
                )}
                {!isCollapsed && unreadCount > 0 && (
                    <span className="bg-rose-500/20 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute bottom-12 left-4 w-84 sm:w-96 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-100 flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                    
                    {/* Header */}
                    <div className="p-3 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <span className="font-semibold text-sm text-white">Alert Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                                <FiCheck size={12} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/10 bg-slate-900/50 p-1 gap-1">
                        <button
                            onClick={() => setActiveTab("billing")}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === "billing"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            <FiDollarSign size={13} />
                            Billing Pending ({billingNotifs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("stock")}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                activeTab === "stock"
                                    ? "bg-indigo-600 text-white shadow-md"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                        >
                            <FiAlertTriangle size={13} />
                            Stock Alerts ({stockNotifs.length})
                        </button>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5 flex-1">
                        {currentNotifs.length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                                <FiAlertCircle size={24} className="text-gray-600" />
                                No pending {activeTab === "billing" ? "billing" : "stock"} notifications.
                            </div>
                        ) : (
                            currentNotifs.map((notif) => (
                                <div key={notif.id} className="p-3.5 hover:bg-white/5 transition-colors flex gap-3 items-start group relative border-l-2 border-amber-500">
                                    <div className="flex-1 min-w-0 pr-6 space-y-1">
                                        <div className="flex items-center justify-between gap-1.5">
                                            <span className="font-bold text-xs text-white truncate block">{notif.title}</span>
                                            {notif.type === "pending_payment_alert" ? (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                                    notif.paymentStatus === 'Partially Paid'
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                    {notif.paymentStatus || 'Pending'}
                                                </span>
                                            ) : (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                                    notif.type === 'out_of_stock'
                                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                                }`}>
                                                    {notif.currentQty} Left
                                                </span>
                                            )}
                                        </div>

                                        {/* Billing details */}
                                        {notif.type === "pending_payment_alert" && (
                                            <div className="space-y-0.5 text-[11px] text-gray-300 pt-0.5">
                                                {notif.partyContact && (
                                                    <div className="flex items-center gap-1 text-gray-400">
                                                        <FiPhone size={11} />
                                                        <span>{notif.partyContact}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-gray-400">Pending Amt:</span>
                                                    <span className="font-mono font-bold text-red-400">
                                                        ₹{Number(notif.pendingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-[11px] text-gray-400 leading-normal mt-1 block pr-2 wrap-break-word">
                                            {notif.message}
                                        </p>
                                    </div>
                                    <div className="absolute top-2.5 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => markAsRead(notif.id)}
                                            title="Mark Read"
                                            className="p-1 rounded text-gray-500 hover:text-indigo-400 hover:bg-white/10 transition-all cursor-pointer"
                                        >
                                            <FiCheck size={12} />
                                        </button>
                                        <button
                                            onClick={() => dismissNotification(notif.id)}
                                            title="Dismiss"
                                            className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer"
                                        >
                                            <FiX size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
