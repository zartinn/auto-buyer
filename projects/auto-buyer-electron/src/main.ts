import { app, BrowserWindow } from 'electron';
import App from './app/app';


export default class Main {

    static initialize() {
        // if (SquirrelEvents.handleEvents()) {
        //     // squirrel event handled (except first run event) and app will exit in 1000ms, so don't do anything else
        //     app.quit();
        // }
    }

    static bootstrapApp() {
        App.main(app, BrowserWindow);
    }
}

// handle setup events as quickly as possible
Main.initialize();

// bootstrap app
Main.bootstrapApp();
