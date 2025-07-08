import { io } from 'socket.io-client';

const BASE_URL = import.meta.env.PROD ? 'https://your-production-url.com' : 'http://127.0.0.1:5000';

// Chat socket with /chat namespace
export const chatSocket = io(`${BASE_URL}/chat`, {
    autoConnect: false,
    withCredentials: true
});

// Game socket without namespace (default)
export const gameSocket = io(BASE_URL, {
    autoConnect: false,
    withCredentials: true,
    transports: ['websocket', 'polling']
});

// Legacy socket for backward compatibility (chat namespace)
export const socket = chatSocket; 