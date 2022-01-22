// declare module for png and svg files in order to be able to import them in typescript files
// See: https://stackoverflow.com/a/63885623
declare module "*.png";
declare module "*.svg";

declare interface Window {
  electron: {
    invoke: import('electron').IpcRenderer.invoke;
    on: import('electron').IpcRenderer.on;
    send: import('electron').IpcRenderer.send;
    platform: string;
  };
}
