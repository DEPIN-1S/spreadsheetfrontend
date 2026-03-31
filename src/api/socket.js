import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:6043/api";

export const getSocket = (token) => {
  return io(SOCKET_URL, {
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    withCredentials: true,
    auth: { token }
  });
};
