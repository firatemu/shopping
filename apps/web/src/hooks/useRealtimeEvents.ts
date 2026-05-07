'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;
const eventListeners = new Map<string, Set<(data: unknown) => void>>();

export type RealtimeEvent =
    | { type: 'stock:updated'; data: { variantId: string; newStock: number; productName: string } }
    | { type: 'order:created'; data: { orderId: string; orderNumber: string; total: number } }
    | { type: 'session:opened'; data: { sessionId: string; openedByName: string; openingBalance: number } }
    | { type: 'session:closed'; data: { sessionId: string; closingBalance: number; difference: number } }
    | { type: 'notification:new'; data: { id: string; title: string; message: string } };

function getSocket(): Socket {
    if (!globalSocket) {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4000`;
        globalSocket = io(wsUrl, {
            path: '/ws',
            transports: ['websocket', 'polling'],
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
    }
    return globalSocket;
}

export function useRealtimeEvents(onEvent?: (event: RealtimeEvent) => void) {
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socket = getSocket();

        const handleConnect = () => setConnected(true);
        const handleDisconnect = () => setConnected(false);
        const handleEvent = (type: string) => (data: unknown) => {
            const event = { type, data } as RealtimeEvent;
            onEventRef.current?.(event);
            eventListeners.get(type)?.forEach((cb) => cb(data));
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        const events: RealtimeEvent['type'][] = [
            'stock:updated', 'order:created', 'session:opened', 'session:closed', 'notification:new',
        ];
        events.forEach((evt) => socket.on(evt, handleEvent(evt)));

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            events.forEach((evt) => socket.off(evt));
        };
    }, []);

    const subscribe = useCallback((event: string, callback: (data: unknown) => void) => {
        if (!eventListeners.has(event)) {
            eventListeners.set(event, new Set());
        }
        eventListeners.get(event)!.add(callback);
        return () => eventListeners.get(event)?.delete(callback);
    }, []);

    return { connected, subscribe };
}

export function disconnectSocket() {
    globalSocket?.disconnect();
    globalSocket = null;
}