const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("node:path");
const http = require("node:http");
const fs = require("node:fs");
const { initAutoUpdate } = require("./updater.cjs");

const distDir = path.join(__dirname, "..", "dist");
const isMac = process.platform === "darwin";

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function startStaticServer(port) {
  const server = http.createServer((req, res) => {
    const requestedPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let filePath = path.join(distDir, requestedPath);
    if (!filePath.startsWith(distDir)) filePath = distDir;
    if (requestedPath === "/" || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, "index.html");
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function send(win, command) {
  win?.webContents.send("menu-command", command);
}

function buildMenu(win) {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { label: "Settings…", accelerator: "CommandOrControl+,", click: () => send(win, { type: "settings" }) },
              { type: "separator" },
              { label: "Lock", accelerator: "Shift+CommandOrControl+L", click: () => send(win, { type: "lock" }) },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        { label: "New Item", accelerator: "CommandOrControl+N", click: () => send(win, { type: "newItem" }) },
        { label: "New Vault…", click: () => send(win, { type: "newVault" }) },
        { type: "separator" },
        { label: "Import…", click: () => send(win, { type: "import" }) },
        { label: "Export…", click: () => send(win, { type: "export" }) },
        ...(!isMac
          ? [
              { type: "separator" },
              { label: "Settings…", accelerator: "CommandOrControl+,", click: () => send(win, { type: "settings" }) },
              { label: "Lock", accelerator: "Shift+CommandOrControl+L", click: () => send(win, { type: "lock" }) },
            ]
          : []),
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { type: "separator" },
        { label: "Copy Username", click: () => send(win, { type: "copyUsername" }) },
        { label: "Copy Password", accelerator: "Shift+CommandOrControl+C", click: () => send(win, { type: "copyPassword" }) },
        { label: "Copy One-Time Password", accelerator: "Alt+CommandOrControl+C", click: () => send(win, { type: "copyTotp" }) },
        { type: "separator" },
        { label: "Find", accelerator: "CommandOrControl+F", click: () => send(win, { type: "search" }) },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "All Items", accelerator: "CommandOrControl+1", click: () => send(win, { type: "allItems" }) },
        { label: "Favorites", accelerator: "CommandOrControl+2", click: () => send(win, { type: "favorites" }) },
        { label: "Watchtower", accelerator: "CommandOrControl+3", click: () => send(win, { type: "watchtower" }) },
        { type: "separator" },
        { label: "Password Generator", click: () => send(win, { type: "generator" }) },
        { label: "Quick Access", accelerator: "Shift+CommandOrControl+Space", click: () => send(win, { type: "quickAccess" }) },
        { type: "separator" },
        { label: "Show Sidebar", accelerator: "Shift+CommandOrControl+D", click: () => send(win, { type: "toggleSidebar" }) },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Item",
      submenu: [
        { label: "Edit", accelerator: "CommandOrControl+E", click: () => send(win, { type: "edit" }) },
        { label: "Save", accelerator: "CommandOrControl+S", click: () => send(win, { type: "save" }) },
        { type: "separator" },
        { label: "Add to Favorites", click: () => send(win, { type: "favorite" }) },
        { label: "Reveal Secure Fields", accelerator: "CommandOrControl+R", click: () => send(win, { type: "reveal" }) },
        { label: "Open Website", click: () => send(win, { type: "openWebsite" }) },
        { type: "separator" },
        { label: "Duplicate", click: () => send(win, { type: "duplicate" }) },
        { label: "Archive", click: () => send(win, { type: "archive" }) },
        { label: "Delete", accelerator: "CommandOrControl+Backspace", click: () => send(win, { type: "delete" }) },
      ],
    },
    { role: "windowMenu" },
    {
      label: "Help",
      submenu: [
        { label: "Keyboard Shortcuts", accelerator: "CommandOrControl+/", click: () => send(win, { type: "shortcuts" }) },
        ...(!isMac ? [{ type: "separator" }, { role: "about" }] : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

let mainWindow = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(async () => {
    await createWindow();
    initAutoUpdate();
  });
}

ipcMain.on("open-external", (_event, url) => {
  if (typeof url === "string" && url.trim()) shell.openExternal(url);
});

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    title: "Keypass",
    backgroundColor: "#F3F4F6",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow = win;
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });
  buildMenu(win);
  ipcMain.removeAllListeners("set-window-title");
  ipcMain.on("set-window-title", (_event, title) => {
    if (typeof title === "string" && title.trim()) win.setTitle(title);
  });

  if (process.env.ELECTRON_START_URL) {
    await win.loadURL(process.env.ELECTRON_START_URL);
  } else {
    await startStaticServer(4321);
    await win.loadURL("http://127.0.0.1:4321");
  }
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
