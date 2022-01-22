import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    send: (eventName: string, args: any[]) => ipcRenderer.send(eventName, args),
    invoke: (eventName: string, args: any[]) => ipcRenderer.invoke(eventName, args),
    on: (eventName: string, cb: () => void) => ipcRenderer.on(eventName, cb),
    platform: process.platform
});