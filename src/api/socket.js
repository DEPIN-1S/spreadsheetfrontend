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

export const getSocket = (token) => {
  return io(SOCKET_URL, {
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: { token }
  });
};
