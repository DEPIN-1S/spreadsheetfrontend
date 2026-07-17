import { useState, useEffect, useRef } from "react";
import { FiBell, FiCheck, FiX, FiAlertTriangle, FiAlertCircle } from "react-icons/fi";
import { invInvoicesApi } from "../api/inventoryApiClient";
import axios from "axios";

// Using the common base url from apiClient
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:6041/api';

export default function NotificationBell({ isCollapsed }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
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
            setNotifications(listRes.data.data || []);
            
            const countRes = await axios.get(`${BASE_URL}/inv/notifications/count`, getHeaders());
            setUnreadCount(countRes.data.data?.count || 0);
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

    const getTypeColor = (type) => {
        switch (type) {
            case "out_of_stock":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            case "expiry_alert":
                return "bg-amber-500/10 text-amber-500 border-amber-500/20";
            case "low_stock":
                return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            default:
                return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
        }
    };

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
                    <span className="font-medium text-sm whitespace-nowrap">Notifications</span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className={`absolute bottom-12 left-4 w-80 bg-[#1e293b] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-100 flex flex-col transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}>
                    <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <span className="font-semibold text-sm text-white">Inventory Alerts</span>
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

                    <div className="max-h-72 overflow-y-auto divide-y divide-white/5 flex-1">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                                <FiAlertCircle size={24} className="text-gray-600" />
                                No pending notifications.
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div key={notif.id} className="p-3 hover:bg-white/5 transition-colors flex gap-2.5 items-start group relative">
                                    <div className={`mt-0.5 p-1 rounded-md border shrink-0 ${getTypeColor(notif.type)}`}>
                                        <FiAlertTriangle size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-6">
                                        <div className="flex items-center justify-between gap-1.5">
                                            <span className="font-semibold text-xs text-white truncate block">{notif.title}</span>
                                        </div>
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
