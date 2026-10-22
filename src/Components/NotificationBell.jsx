import { useState, useEffect } from "react";
import { FiBell } from "react-icons/fi";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:6041/api';

export default function NotificationBell({ isCollapsed, activePath, setActivePath }) {
    const [unreadCount, setUnreadCount] = useState(0);

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
            const rawNotifs = listRes.data?.data || [];
            setUnreadCount(rawNotifs.length);
        } catch (error) {
<<<<<<< HEAD
            console.error("Error fetching notifications count:", error);
=======
            if (error.response?.status === 429) stopNotifPollRef.current = true;
            console.error("Error fetching notifications:", error);
>>>>>>> a7370dc (refactor: streamline API request handling, enhance GST mapping, and improve media URL resolution in invoice generation components)
        }
    };

    const stopNotifPollRef = useRef(false);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(() => {
            if (stopNotifPollRef.current) return;
            fetchNotifications();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const isActive = activePath === "/notifications";

    return (
        <button
            onClick={() => setActivePath && setActivePath("/notifications")}
            className={`relative w-full flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer ${
                isActive 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30" 
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
            } ${isCollapsed ? "justify-center px-2" : "gap-3"}`}
            title={isCollapsed ? "Notifications" : ""}
        >
            <div className="relative shrink-0 flex items-center justify-center">
                <FiBell size={20} className={`${isActive ? "text-white" : unreadCount > 0 ? "text-amber-400 animate-swing origin-top" : "text-gray-400"}`} />
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
                <span className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                    {unreadCount}
                </span>
            )}
        </button>
    );
}
