const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("keypass", {
  onMenuCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on("menu-command", listener);
    return () => ipcRenderer.removeListener("menu-command", listener);
  },
  setWindowTitle: (title) => {
    ipcRenderer.send("set-window-title", title);
  },
  openExternal: (url) => {
    ipcRenderer.send("open-external", url);
  },
});
