/**
 * ASUS links:
 * https://webshop.asus.com/de/komponenten/grafikkarten/rtx-30-serie/2991/asus-rog-strix-rtx3060ti-o8g-gaming
 * https://webshop.asus.com/de/komponenten/grafikkarten/rtx-30-serie/2988/asus-dual-rtx3060ti-8g
 * https://webshop.asus.com/de/komponenten/grafikkarten/rtx-30-serie/2986/asus-tuf-rtx3060ti-o8g-gaming
 * https://webshop.asus.com/de/komponenten/grafikkarten/rtx-30-serie/2989/asus-dual-rtx3060ti-o8g
 * https://webshop.asus.com/de/komponenten/grafikkarten/nvidia-serie/2985/asus-tuf-rtx3060ti-8g-gaming
 */

import { question, Utils } from '../util';
import { timer } from 'rxjs';
import { load } from 'cheerio';
import { getPlatformInfo, Job } from '@auto-buyer-shared/types';
import { BuyerJob } from '../buyer';
import * as inquirer from 'inquirer';
import { writeFileSync } from 'fs';
import { join } from 'path';

export class AsusJob extends BuyerJob {
    constructor(job: Job) {
        super(job);
        const platformInfos = getPlatformInfo(this.job.platform, this.job.url, this.job.magic);
        this.job.cookies = this.job.cookies ? this.job.cookies.concat(platformInfos.cookies) : platformInfos.cookies;
    }

    public async run() {
        this.isRunning = true;
        while (this.isRunning) {
            try {
                await this.fetchData();
                await this.asusCheckout();
            } catch(e) {
                Utils.window.webContents.send(`job-error-${this.job.name}`, { job: this.job, error: e } );
            }
            await timer(2000).toPromise();
        } 
    }

    private async asusCheckout() {
        const $ = load(this.fetchedData);
        const errorTitle = $('.detail-error--headline');
        let cartButton;
        if (errorTitle.length === 0) {
            cartButton = $('.buybox--button');
        }
        if (cartButton && cartButton.length > 0) {
            try {
                writeFileSync(join(__dirname, this.job.name + '.html'), this.fetchedData);
                Utils.playAlarm();
                await this.setupPage();
                await this.page.goto(this.job.url);
                await this.page.evaluate(() => {
                    localStorage.setItem('cleverpush-deny-time', '1613490216683');
                    localStorage.setItem('cleverpush-subscription-status', 'denied');
                });
                const cartButton = await this.page.waitForSelector('.buybox--button');
                await cartButton.click();
                await timer(500).toPromise();
                await this.page.goto('https://webshop.asus.com/de/checkout/confirm');
                await this.login();
                const agb = await this.page.waitForSelector('#sAGB');
                await agb.click();
                const checkoutButton = await this.page.waitForSelector('.main--actions button');
                if (this.job.test) {
                    console.log('do NOT click');
                } else {
                    await checkoutButton.click();
                }
            } catch(e) {
                console.log('Error while asus checkout: ', e);
            }
            await inquirer.prompt(question);
        }
    }

    private async login() {
        const email = await this.page.waitForSelector('#email');
        const pw = await this.page.waitForSelector('#passwort');
        await email.click();
        await this.page.keyboard.type(this.billingInfo.login);
        await pw.click();
        await this.page.keyboard.type(this.billingInfo.pw);
        const loginButton = await this.page.waitForSelector('.register--login-action button');
        await loginButton.click();
    }
}
