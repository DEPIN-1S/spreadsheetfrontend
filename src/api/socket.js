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
let visibilityBound = false;

const bindVisibilityReconnect = () => {
  if (visibilityBound || typeof document === "undefined") return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !socketInstance) return;
    if (!socketInstance.connected) {
      socketInstance.connect();
    }
  });
  window.addEventListener("online", () => {
    if (socketInstance && !socketInstance.connected) {
      socketInstance.connect();
    }
  });
};

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
      reconnectionDelayMax: 5000,
      timeout: 20000,
      pingInterval: 25000,
      pingTimeout: 60000,
      rememberUpgrade: true
    });

    socketInstance.on("connect_error", (err) => {
      console.warn("Socket connection error:", err.message);
    });
    bindVisibilityReconnect();
  } else if (token && socketInstance.auth.token !== token) {
    socketInstance.auth.token = token;
    socketInstance.disconnect();
    socketInstance.connect();
  } else if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
};
