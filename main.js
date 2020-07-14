const os = require('os');
const path = require('path');
const slash = require('slash');
const log = require('electron-log');
const imagemin = require('imagemin');
const imageMinMozJpeg = require('imagemin-mozjpeg');
const imageMinPngQuant = require('imagemin-pngquant');
const { app, BrowserWindow, Menu, ipcMain } = require('electron');

// Set environment
process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production' ? true : false;
const isMac = process.platform === 'darwin' ? true : false;

let mainWindow;
let aboutWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'Image Shrinker',
    width: isDev ? 900 : 500,
    height: 600,
    resizable: isDev,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    backgroundColor: 'white',
    webPreferences: {
      nodeIntegration: true,
    },
  });
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.loadFile(`${__dirname}/app/index.html`);
};

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    title: 'About Image Shrinker',
    width: 350,
    height: 350,
    resizable: false,
    icon: `${__dirname}/assets/icons/Icon_256x256.png`,
    backgroundColor: 'white',
  });
  aboutWindow.loadFile(`${__dirname}/app/about.html`);
};

app.on('ready', () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
  mainWindow.on('closed', () => mainWindow = null);
});

const menu = [
  ...(isMac ? [{
    label: app.name,
    submenu: [
      {
        label: 'About',
        click: createAboutWindow,
      }
    ]
  }] : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac ? [{
    label: 'Other',
    submenu: [
      {
        label: 'About',
        click: createAboutWindow,
      }
    ]
  }] : []),
  ...(isDev ? [
    {
      label: 'Developer',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
        { type: 'separator' },
        { role: 'toggledevtools' }
      ]
    }
  ] : [])
];

ipcMain.on('image:minimize', (event, options) => {
  options.destination = path.join(os.homedir(), 'imageshrink');
  shrinkImage(options);
});

const shrinkImage = async ({ imgPath, quality, destination }) => {
  try {
    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination: destination,
      plugins: [
        imageMinMozJpeg({ quality: quality }),
        imageMinPngQuant({ quality: [pngQuality, pngQuality] }),
      ]
    });
    mainWindow.webContents.send('image:done');
    log.info(files);
  } catch (err) {
    console.log(err);
    log.error(err);
  }
}

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
});