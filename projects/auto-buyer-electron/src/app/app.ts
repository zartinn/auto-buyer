import { BrowserWindow, shell, screen, ipcMain, LoadURLOptions } from 'electron';
import { rendererAppName, rendererAppPort } from './constants';
import { environment } from '../environments/environment';
import { join } from 'path';
import { format } from 'url';
import { getBillings, getJobs, saveBillings, saveJobs, Utils } from './auto-buyer/util';
import { setupPuppeteer } from './auto-buyer/page';
import { Job, Platform } from '@auto-buyer-shared/types';
import { AmdJob } from './auto-buyer/sites/amd';
import { BuyerJob } from './auto-buyer/buyer';
import { NvidiaJob } from './auto-buyer/sites/nvidia';
import { AmazonJob } from './auto-buyer/sites/amazon';
import { AsusJob } from './auto-buyer/sites/asus';

export default class App {
    // Keep a global reference of the window object, if you don't, the window will
    // be closed automatically when the JavaScript object is garbage collected.
    static mainWindow: Electron.BrowserWindow;
    static application: Electron.App;
    static BrowserWindow;
    static runningJobs: BuyerJob[] = [];

    public static isDevelopmentMode() {
        const isEnvironmentSet: boolean = 'ELECTRON_IS_DEV' in process.env;
        const getFromEnvironment: boolean = parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

        return isEnvironmentSet ? getFromEnvironment : !environment.production;
    }

    private static onWindowAllClosed() {
        if (process.platform !== 'darwin') {
            App.application.quit();
        }
    }

    private static onClose() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        App.mainWindow = null;
    }

    private static onRedirect(event: any, url: string) {
        if (url !== App.mainWindow.webContents.getURL()) {
            // this is a normal external redirect, open it in a new browser window
            event.preventDefault();
            shell.openExternal(url);
        }
    }

    private static async onReady() {
        App.initMainWindow();
        App.loadMainWindow();
        App.setupEventHandler();
        Utils.appDataPath = App.application.getPath('appData');
        Utils.applicationPath = App.application.getAppPath();
        Utils.window = App.mainWindow;
        await setupPuppeteer();
    }

    private static setupEventHandler() {
        ipcMain.handle('save-jobs', (_, data) => {
            try {
                saveJobs(data);
                return true;
            } catch(e) {
                return false;
            }
        });

        ipcMain.handle('get-jobs', () => {
            try {
                const jobs = getJobs();
                return jobs;
            } catch(e) {
                return [];
            }
        });

        ipcMain.handle('save-billings', (_, data) => {
            try {
                saveBillings(data);
                return true;
            } catch(e) {
                return false;
            }
        });

        ipcMain.handle('get-billings', () => {
            try {
                return getBillings();
            } catch(e) {
                return [];
            }
        });

        ipcMain.on('start-job', async (event, jobData) => {
            if (!this.runningJobs.find(j => j.job.name === jobData.name)) {
                const buyJob = await createJob(jobData);
                buyJob.run();
                this.runningJobs.push(buyJob);
            }
        }); 

        ipcMain.on('stop-job', (_, job: Job) => {
            const buyJob = this.runningJobs.find(j => j.job.name === job.name);
            this.runningJobs = this.runningJobs.filter(j => j.job.name !== job.name);
            if (buyJob) {
                buyJob.stop();
            }
        });
    }


    private static onActivate() {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (App.mainWindow === null) {
            App.onReady();
        }
    }

    private static initMainWindow() {
        const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
        const width = Math.min(1280, workAreaSize.width || 1280); 
        const height = Math.min(720, workAreaSize.height || 720);

        // Create the browser window.
        App.mainWindow = new BrowserWindow({ width: width, height: height, show: false, webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                preload: join(__dirname, 'preload.js')
            }
        });
        // App.mainWindow.setMenu(null);
        App.mainWindow.center();

        // if main window is ready to show, close the splash window and show the main window
        App.mainWindow.once('ready-to-show', () => {
            App.mainWindow.show(); 
        });

        // handle all external redirects in a new browser window
        // App.mainWindow.webContents.on('will-navigate', App.onRedirect);
        // App.mainWindow.webContents.on('new-window', (event, url, frameName, disposition, options) => {
        //     App.onRedirect(event, url);
        // });

        // Emitted when the window is closed.
        App.mainWindow.on('closed', () => {
            // Dereference the window object, usually you would store windows
            // in an array if your app supports multi windows, this is the time
            // when you should delete the corresponding element.
            App.mainWindow = null;
        });
    }

    private static loadMainWindow() {
        // load the index.html of the app.
        const options: LoadURLOptions = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4298.0 Safari/537.36'
        }
        if (!App.application.isPackaged) {
            App.mainWindow.loadURL(`http://localhost:${rendererAppPort}`, options);
        } else {
            App.mainWindow.loadURL(format({
                pathname: join(__dirname, '..', rendererAppName, 'index.html'),
                protocol: 'file:',
                slashes: true
            }));
        }
    }

    static main(app: Electron.App, browserWindow: typeof BrowserWindow) {
        // we pass the Electron.App object and the
        // Electron.BrowserWindow into this function
        // so this class has no dependencies. This
        // makes the code easier to write tests for

        App.BrowserWindow = browserWindow;
        App.application = app;

        App.application.on('window-all-closed', App.onWindowAllClosed);     // Quit when all windows are closed.
        App.application.on('ready', App.onReady);                           // App is ready to load data
        App.application.on('activate', App.onActivate);                     // App is activated
    }
}


function createJob(jobData: Job) {
    switch(jobData.platform) {
        case Platform.AMD: return new AmdJob(jobData);
        case Platform.NVIDIA: return new NvidiaJob(jobData);
        case Platform.CUSTOM: return new NvidiaJob(jobData);
        case Platform.ASUS: return new AsusJob(jobData);
        // case Platform.NBB: return new AmdJob(jobData);
        case Platform.AMAZON: return new AmazonJob(jobData);
    }
}
