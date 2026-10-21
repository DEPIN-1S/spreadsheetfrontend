import React, { useState, useEffect, useMemo } from "react";
import { 
    FiBell, FiCheck, FiCheckCircle, FiX, FiAlertTriangle, FiAlertCircle, 
    FiDollarSign, FiClock, FiCalendar, FiPhone, FiRefreshCw, 
    FiMenu
} from "react-icons/fi";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:6041/api';

export default function Notifications({ setMobileOpen, setActivePath }) {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all"); // 'all', 'billing', 'stock', 'expiry'

    const getHeaders = () => {
        const token = localStorage.getItem("accessToken");
        return {
            headers: {
                Authorization: token ? `Bearer ${token}` : ""
            }
        };
    };

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const listRes = await axios.get(`${BASE_URL}/inv/notifications?isRead=false`, getHeaders());
            const rawNotifs = listRes.data?.data || [];
            setNotifications(rawNotifs);
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.patch(`${BASE_URL}/inv/notifications/${id}/read`, {}, getHeaders());
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const dismissNotification = async (id) => {
        try {
            await axios.patch(`${BASE_URL}/inv/notifications/${id}/dismiss`, {}, getHeaders());
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error("Error dismissing notification:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.patch(`${BASE_URL}/inv/notifications/read-all`, {}, getHeaders());
            setNotifications([]);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    // Date parsing & formatting
    const parseDateValue = (value) => {
        if (!value) return null;
        const raw = String(value).trim();
        if (!raw) return null;
        let d = new Date(raw);
        if (Number.isNaN(d.getTime()) && /^\d{4}-\d{2}$/.test(raw)) {
            const [y, m] = raw.split('-').map(Number);
            d = new Date(y, m - 1, 1);
        }
        if (Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            const [y, m, day] = raw.split('-').map(Number);
            d = new Date(y, m - 1, day);
        }
        return Number.isNaN(d.getTime()) ? null : d;
    };

    const formatFullDate = (value) => {
        const d = parseDateValue(value);
        if (!d) return null;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatRelativeTime = (value) => {
        const d = parseDateValue(value);
        if (!d) return "Recently";
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const getExpiryRelative = (value) => {
        const d = parseDateValue(value);
        if (!d) return null;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfAlert = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayDiff = Math.round((startOfAlert - startOfToday) / 86400000);
        if (dayDiff === 0) return 'Expires today';
        if (dayDiff === 1) return 'Expires tomorrow';
        if (dayDiff < 0) return `Expired ${Math.abs(dayDiff)}d ago`;
        return `Expires in ${dayDiff}d`;
    };

    const getAlertTime = (notif) => notif.createdAt || notif.created_at || notif.updatedAt || notif.updated_at;

    // Counts for tabs
    const billingCount = useMemo(() => {
        return notifications.filter(n => n.type === 'pending_payment_alert').length;
    }, [notifications]);

    const stockCount = useMemo(() => {
        return notifications.filter(n => n.type === 'out_of_stock' || n.type === 'low_stock').length;
    }, [notifications]);

    const expiryCount = useMemo(() => {
        return notifications.filter(n => n.type === 'expiry_alert').length;
    }, [notifications]);

    // Filtered notifications by tab
    const filteredNotifications = useMemo(() => {
        return notifications.filter(notif => {
            if (activeTab === "billing" && notif.type !== "pending_payment_alert") return false;
            if (activeTab === "stock" && (notif.type !== "out_of_stock" && notif.type !== "low_stock")) return false;
            if (activeTab === "expiry" && notif.type !== "expiry_alert") return false;
            return true;
        });
    }, [notifications, activeTab]);

    // Render helper for type badge & icon
    const getNotificationTypeConfig = (notif) => {
        if (notif.type === 'pending_payment_alert') {
            const isPartiallyPaid = notif.paymentStatus === 'Partially Paid';
            return {
                icon: <FiDollarSign size={16} className="text-blue-600" />,
                iconBg: "bg-blue-50 border border-blue-100",
                badge: (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isPartiallyPaid ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                        {notif.paymentStatus || 'Payment Due'}
                    </span>
                )
            };
        }

        if (notif.type === 'out_of_stock') {
            return {
                icon: <FiAlertCircle size={16} className="text-red-600" />,
                iconBg: "bg-red-50 border border-red-100",
                badge: (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        Out of Stock
                    </span>
                )
            };
        }

        if (notif.type === 'expiry_alert') {
            return {
                icon: <FiCalendar size={16} className="text-orange-600" />,
                iconBg: "bg-orange-50 border border-orange-100",
                badge: (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {getExpiryRelative(notif.expiryDate) || 'Expiry Warning'}
                    </span>
                )
            };
        }

        // low_stock default
        return {
            icon: <FiAlertTriangle size={16} className="text-amber-600" />,
            iconBg: "bg-amber-50 border border-amber-100",
            badge: (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Low Stock {notif.currentQty !== undefined ? `(${notif.currentQty} left)` : ''}
                </span>
            )
        };
    };

    return (
        <div className="flex flex-col h-screen max-h-screen bg-gray-50 overflow-hidden">
            {/* Pinned Fixed Section: Header + Category Switching Tabs */}
            <div className="shrink-0 bg-white border-b border-gray-200 sticky top-0 z-20 shadow-2xs">
                {/* Header */}
                <div className="px-4 sm:px-8 pt-5 pb-4 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-5xl mx-auto">
                        <div className="flex items-center gap-3">
                            {setMobileOpen && (
                                <button
                                    onClick={() => setMobileOpen(true)}
                                    className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                    title="Open Sidebar"
                                >
                                    <FiMenu size={20} />
                                </button>
                            )}
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Notifications</h1>
                                    {notifications.length > 0 && (
                                        <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                                            {notifications.length} unread
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                                    Real-time alerts for stock shortage, expiry, and pending invoices.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-end sm:self-auto">
                            <button
                                onClick={fetchNotifications}
                                disabled={isLoading}
                                className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                title="Refresh notifications"
                            >
                                <FiRefreshCw size={13} className={isLoading ? "animate-spin text-indigo-600" : ""} />
                                <span>Refresh</span>
                            </button>

                            {notifications.length > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                    title="Mark all notifications as read"
                                >
                                    <FiCheck size={14} />
                                    <span>Mark all as read</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Category Switching Tabs */}
                <div className="px-4 sm:px-8 py-3 bg-white">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-5xl mx-auto">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                activeTab === "all"
                                    ? "bg-gray-900 text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                        >
                            <span>All</span>
                            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                                activeTab === "all" ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-600"
                            }`}>
                                {notifications.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("billing")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                activeTab === "billing"
                                    ? "bg-gray-900 text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                        >
                            <span>Payments</span>
                            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                                activeTab === "billing" ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-600"
                            }`}>
                                {billingCount}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("stock")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                activeTab === "stock"
                                    ? "bg-gray-900 text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                        >
                            <span>Stock</span>
                            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                                activeTab === "stock" ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-600"
                            }`}>
                                {stockCount}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab("expiry")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                activeTab === "expiry"
                                    ? "bg-gray-900 text-white"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                        >
                            <span>Expiry</span>
                            <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                                activeTab === "expiry" ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-600"
                            }`}>
                                {expiryCount}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Notifications Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-5xl mx-auto">
                    {isLoading ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                            <FiRefreshCw className="animate-spin text-indigo-600" size={28} />
                            <p className="text-xs font-medium text-gray-500">Loading notifications...</p>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                                <FiCheckCircle size={24} />
                            </div>
                            <h3 className="text-base font-bold text-gray-900">No notifications</h3>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                                You're all caught up! There are no pending alerts in this category.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 shadow-xs overflow-hidden">
                            {filteredNotifications.map((notif) => {
                                const isBilling = notif.type === "pending_payment_alert";
                                const isExpiry = notif.type === "expiry_alert";
                                const { icon, iconBg, badge } = getNotificationTypeConfig(notif);
                                const alertTime = getAlertTime(notif);

                                return (
                                    <div 
                                        key={notif.id}
                                        className="p-4 sm:px-5 hover:bg-gray-50/70 transition-colors flex items-start gap-3.5 group"
                                    >
                                        {/* Type Icon */}
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
                                            {icon}
                                        </div>

                                        {/* Main Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h3 className="text-sm font-semibold text-gray-900 leading-snug">
                                                    {notif.title}
                                                </h3>
                                                {badge}
                                            </div>

                                            {notif.message && (
                                                <p className="text-xs text-gray-600 leading-relaxed mb-2">
                                                    {notif.message}
                                                </p>
                                            )}

                                            {/* Metadata Row */}
                                            <div className="flex flex-wrap items-center gap-3.5 text-xs text-gray-500">
                                                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                    <FiClock size={11} />
                                                    {formatRelativeTime(alertTime)}
                                                </span>

                                                {/* Billing Details */}
                                                {isBilling && notif.pendingAmount > 0 && (
                                                    <span className="font-semibold text-red-600 text-xs">
                                                        Pending: ₹{Number(notif.pendingAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}

                                                {isBilling && notif.partyContact && (
                                                    <span className="flex items-center gap-1 text-[11px] text-gray-600">
                                                        <FiPhone size={11} className="text-gray-400" />
                                                        {notif.partyContact}
                                                    </span>
                                                )}

                                                {/* Expiry Date */}
                                                {isExpiry && notif.expiryDate && (
                                                    <span className="flex items-center gap-1 text-[11px] text-orange-700 font-medium">
                                                        <FiCalendar size={11} />
                                                        Date: {formatFullDate(notif.expiryDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 shrink-0 self-center sm:self-center">
                                            <button
                                                onClick={() => markAsRead(notif.id)}
                                                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                                title="Mark as read"
                                            >
                                                <FiCheck size={14} className="stroke-[2.5]" />
                                                <span>Mark as Read</span>
                                            </button>
                                            <button
                                                onClick={() => dismissNotification(notif.id)}
                                                className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-red-700 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                                                title="Dismiss notification"
                                            >
                                                <FiX size={13} />
                                                <span>Dismiss</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
