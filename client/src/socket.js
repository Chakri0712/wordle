import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_URL || window.location.origin, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
});

export default socket;
