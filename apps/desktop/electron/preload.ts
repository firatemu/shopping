/**
 * SoftShopping Desktop — Preload Script
 *
 * Exposes secure IPC channels to the renderer process via contextBridge.
 * The renderer NEVER has direct Node.js / Electron API access.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    // ÖKC (fiscal printer) communication
    okc: {
        send: (command: string) => ipcRenderer.invoke('okc:send', command),
        status: () => ipcRenderer.invoke('okc:status'),
    },

    // Receipt printing
    print: {
        receipt: (data: object) => ipcRenderer.invoke('print:receipt', data),
    },

    // Platform info
    platform: process.platform,

    // Menu event listeners
    onMenuNewSale: (callback: () => void) => {
        ipcRenderer.on('menu:new-sale', callback);
        return () => ipcRenderer.removeListener('menu:new-sale', callback);
    },
});