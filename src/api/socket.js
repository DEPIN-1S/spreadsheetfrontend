import { io } from "socket.io-client";

const rawUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:6041/api";
const getBaseUrl = (urlStr) => {
  try {
    const url = new URL(urlStr);
    return `${url.protocol}//${url.host}`;
  } catch (e) {
    return urlStr.replace(/\/api$/, "").replace(/\/api\/$/, "");
  }
};
const SOCKET_URL = getBaseUrl(rawUrl);

let socketInstance = null;

export const getSocket = (token) => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      withCredentials: true,
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });
  } else if (token && socketInstance.auth.token !== token) {
    // If token changed (e.g. user logged in as someone else), reconnect with new token
    socketInstance.auth.token = token;
    socketInstance.disconnect();
    socketInstance.connect();
  } else if (!socketInstance.connected) {
    // Ensure it connects if it was disconnected
    socketInstance.connect();
  }

  return socketInstance;
};
