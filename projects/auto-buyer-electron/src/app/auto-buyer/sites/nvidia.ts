
import {  resolve } from 'path';
import { writeFileSync } from 'fs';
import { question, Utils } from '../util';
import * as inquirer from 'inquirer';
import { timer } from 'rxjs';
import { Job } from '@auto-buyer-shared/types';
import { nbbLocalStorage } from './cookie/nbb';
import { BuyerJob } from '../buyer';
import { ElementHandle } from 'puppeteer-core';
import fetch from 'node-fetch';
import { load } from 'cheerio';

interface NvidiaProduct {
    displayName: string,
    prdStatus: 'out_of_stock' | 'check_availability',
    retailers: {
        productTitle: string,
        directPurchaseLink: string,
        purchaseLink: string,
        isAvailable: boolean,
        retailerName: string,
    }[]
}

export class NvidiaJob extends BuyerJob {
    private consentClicked = false;
    private login: any = {};

    constructor(job: Job) {
        super(job);
        this.login.name = this.billingInfo.login;
        this.login.pw = this.billingInfo.pw;
    }

    public async run() {
        this.isRunning = true;
        while (this.isRunning) {
            try {
                let shopLink = this.job.url;
                if (!this.job.test) {
                    await this.fetchData(3000, true)
                    const products = await this.getProducts();
                    shopLink = this.getShopLink(products);
                }
                if (shopLink) {
                    const available = await this.checkOnNbb(shopLink);
                    if (available) {
                        await this.checkout(shopLink + (this.job.magic ? '/action/add_product' : ''));
                    }
                }
            } catch(e) {
                console.log(e);
                Utils.window.webContents.send('job-error', { job: this.job, error: e } );
            }
            await timer(1000).toPromise();
        }
    }

    private async checkOnNbb(shopLink) {
        const nbbHeaders = Object.assign({}, this.headers);
        nbbHeaders.host = 'www.notebooksbilliger.de';
        const res = await fetch(shopLink, { headers: nbbHeaders });
        const html = await res.text();
        const $ = load(html);
        let cartButton = $('.shopping_cart_btn button');
        if (cartButton.length > 0) {
            const disabled = cartButton.attr('disabled');
            if (!disabled) {
                return true;
            }
        }
        return false;
    }

    private async getProducts() {
        if (!this.fetchedData) {
            return [];
        }
        const buffer = await this.fetchedData.buffer();
        const json = JSON.parse(buffer.toString());
        let products: NvidiaProduct[] = [];
        products.push(json.searchedProducts.featuredProduct);
        products.push(...json.searchedProducts.productDetails);
        writeFileSync(resolve(__dirname, 'all_nvidia.json'), JSON.stringify(products, null, 2));
        products = products.filter(p => this.job.productText.find(text => p.displayName.includes(text)));
        writeFileSync(resolve(__dirname, 'nvidia.json'), JSON.stringify(products, null, 2));
        return products;
    }

    private async checkout(link) {
        try {
            Utils.playAlarm();
            await this.setupPage();
            await this.page.goto(link);
            await this.page.evaluate((nbbLocalStorage) => {
                nbbLocalStorage.forEach(entry => {
                    localStorage.setItem(entry.key, entry.value);
                });
            }, nbbLocalStorage);
            await this.checkNbbCheckout();
        } catch (e) {
            console.log('error while nvidia/nbb checkout', e);
        }
        await inquirer.prompt(question);
    }

    private async checkNbbCheckout() {
        if (!this.job.magic) {
            let cartButton: ElementHandle;
            while(!cartButton) {
                cartButton = await this.page.$('.shopping_cart_btn button');
                if (cartButton) {
                    const isDisabled = await cartButton.evaluate(el => el.getAttribute('disabled'));
                    if (isDisabled) {
                        cartButton = null;
                    }
                }
            }
            await cartButton.click();
        }
        await timer(500).toPromise();
        await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 300000 });
        await this.page.goto('https://www.notebooksbilliger.de/kasse/anmelden');
        let checkoutButton;
        // await checkoutButton.click();
        const email = await this.page.waitForSelector('#f_email_address');
        const input = await this.page.waitForSelector('#f_password');
        await email.click();
        await this.page.keyboard.type(this.login.name);
        await input.click();
        await this.page.keyboard.type(this.login.pw);
        await timer(100).toPromise();
        const loginButton = await this.page.$('form .nbx-btn');
        await loginButton.click();
        const agbBlock = await this.page.waitForSelector('.agb.nbx-checkbox');
        const vorkasse = await this.page.$('#idpaymoneyorder');
        if (vorkasse) {
            await vorkasse.click();
        }
        await agbBlock.evaluate(el => el.scrollIntoView());
        const labels = await agbBlock.$$('label');
        let conditionsLabel: ElementHandle;
        for(const label of labels) {
            const forAttr = await label.evaluate(el => el.getAttribute('for'));
            if (forAttr === 'conditions') {
                conditionsLabel = label;
            }
        }
        await timer(800).toPromise();
        const span = await conditionsLabel.$('span');
        const positions = await span.boundingBox();
        await this.page.mouse.click(positions.x + 5, positions.y + 7, { delay: 50 });
        const weiterButton = await this.page.$('#button_bottom button');
        await weiterButton.click();
        // await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 300000 });
        checkoutButton = await this.page.waitForSelector('.checkout_button');
        const text = await checkoutButton.evaluate((el) => el.textContent);
        if (this.job.test) {
            console.log('DO NOT CLICK');
        } else {
            console.log('CLICK');
            await checkoutButton.click();
        }
        await timer(500).toPromise();
    }

    private async clickConsent() {
        if (this.consentClicked) {
            return;
        }
        const consentBanner = await this.page.$('#uc-banner-centered');
        if (consentBanner) {
            const consentButton = await this.page.$('#uc-btn-deny-banner');
            const position = await consentButton.boundingBox();
            if (consentButton) {
                await this.page.mouse.click(position.x + position.width - 10, position.y + 10);
                await timer(100).toPromise();
                this.consentClicked = true;
            }
        }
    }

    private getShopLink(products: NvidiaProduct[]) {
        for (let p of products) {
            if (p.retailers && p.retailers.length > 0) {
                const nbbRetailer = p.retailers.find(retailer => retailer.retailerName.includes('notebooksbilliger'));
                if (nbbRetailer) {
                    const shopLink = p.retailers[0].purchaseLink || p.retailers[0].directPurchaseLink;
                    return shopLink;
                }
            }
        }
        return null;
    }
}
