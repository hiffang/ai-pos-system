const { app, BrowserWindow } = require("electron");
const path = require("path");

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  const isDev = process.env.NODE_ENV === "development";
  const startUrl = isDev
    ? "http://localhost:5173"
    : `file://${path.join(__dirname, "../client/dist/index.html")}`;

  mainWindow.loadURL(startUrl);
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
