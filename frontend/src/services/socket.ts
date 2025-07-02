import { io } from 'socket.io-client';

const URL = import.meta.env.PROD ? 'https://your-production-url.com' : 'http://127.0.0.1:5000';

export const socket = io(URL, {
    autoConnect: false,
    withCredentials: true
}); 