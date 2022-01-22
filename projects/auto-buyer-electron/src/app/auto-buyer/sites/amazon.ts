import { load } from 'cheerio';
const player = require('sound-play');
import { join } from 'path';
import { writeFileSync } from 'fs';
import * as inquirer from 'inquirer';
import { Page } from 'puppeteer-core';
import { question, Utils } from '../util';
// import { amazonCookie } from './cookies';
import { BuyerJob } from '../buyer';
import { Job } from '@auto-buyer-shared/types';
import { timer } from 'rxjs';
import { amazonPw } from './credentials';

export class AmazonJob extends BuyerJob {
    constructor(job: Job) {
        super(job);
    }

    public async run() {
        this.isRunning = true;
        while (this.isRunning) {
            try {
                await this.fetchData();
                writeFileSync(join(__dirname, 'amazon.html'), this.fetchedData, { encoding: 'utf-8'});
            } catch(e) {
                Utils.window.webContents.send(`job-error-${this.job.name}`, { job: this.job, error: e } );
            }
            await timer(200).toPromise();
        }
    }
}

export async function amazonCheckout(data, html, status, page: Page) {
    const $ = load(html);
    let price = await $('#priceblock_ourprice');

    if (Number.parseFloat(price.text()) <= data.maxPrice) {
        try {
            player.play(join(__dirname, '..', 'sound.wav'));
            // await setCookies(amazonCookie, page);
            await page.goto(data.url);
            const addToCartButton = await page.waitForSelector('#add-to-cart-button', { timeout: 10000 });
            await addToCartButton.click();
            const toCartButton = await page.waitForSelector('#hlb-ptc-btn-native', { timeout: 10000 });
            await toCartButton.click();
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            if (page.url().includes('https://www.amazon.de/ap/signin')) {
                await signIn(page);
            }
            const priceElement = await page.$('#subtotals-marketplace-spp-bottom');
            const finalPrice = Number.parseFloat((await priceElement.evaluate(el => el.textContent)).split(':')[1]);
            if (finalPrice < data.maxPrice) {
                const checkoutButton = await page.waitForSelector('#submitOrderButtonId', { timeout: 10000 });
                // await checkoutButton.click();
            }
        } catch (e) { 
            console.log('error while checkout for amazon');
            writeFileSync(join(__dirname, `error_${data.saveFile}.txt`), e.toString(), { encoding: 'utf-8' });
        }
        await inquirer.prompt(question);
    }
}


async function signIn(page: Page) {
    const input = await page.$('#ap_password');
    await input.click();
    await page.keyboard.type(amazonPw, { delay: 50 });
    const submitButton = await page.$('#signInSubmit');
    await submitButton.click();
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
}

