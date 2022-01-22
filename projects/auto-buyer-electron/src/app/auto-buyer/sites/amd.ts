
import { join } from 'path';
import { writeFileSync } from 'fs';
import { getPayPalCookies, question, setInput, Utils } from '../util';
import * as inquirer from 'inquirer';
import { timer } from 'rxjs';
import { load } from 'cheerio';
import { BillingType, getPlatformInfo, Job } from '@auto-buyer-shared/types';
import { BuyerJob } from '../buyer';
import { solveCaptcha } from '../page';
import { ElementHandle } from 'puppeteer-core';

export class AmdJob extends BuyerJob {
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
                await this.amdCheckout();
            } catch(e) {
                Utils.window.webContents.send(`job-error-${this.job.name}`, { job: this.job, error: e } );
            }
            await timer(2000).toPromise();
        } 
    }

    private async amdCheckout() {
        this.fetchedData = this.fetchedData.replace(/Wir müssen Ihnen leider mitteilen, dass.*/gm, '');
        if (this.job.id) {
            await this.checkSinglePage();
        } else {
            await this.checkOverviewPage();
        }
    }

    // "request to https://shop.amd.com/store?Action=buy&Locale=de_DE&ProductID=5358857900&SiteID=amd failed, reason: write EPROTO 3608321560:error:10000458:SSL routines:OPENSSL_internal:TLSV1_ALERT_UNRECOGNIZED_NAME:../../third_party/boringssl/src/ssl/tls_record.cc:594:SSL alert number 112"

    private async checkSinglePage() {
        let found = false;
        const $ = load(this.fetchedData);
        if (this.job.magic) {
            let title = await $('head title');
            found = title.text().includes('Warenkorb') ? true : false;
        } else {
            $('.btn-shopping-cart').each((index, el) => {
                const href = $(el).attr('href');
                if (href.includes(this.job.id)) {
                    found = true;
                }
            });
        }
        if (found) {
            try {
                console.log(`Found article at ${new Date().toLocaleTimeString()} for job: `, this.job.name)
                Utils.playAlarm();
                writeFileSync(join(__dirname, this.job.name), this.fetchedData, { encoding: 'utf-8' })
                await this.setupPage();
                await this.checkout([{title: (this.job.productText[0] || ''), id: this.job.id}]);
            } catch (e) {
                Utils.window.webContents.send(`job-error-${this.job.name}`, { job: this.job, error: e } );
            }
            if (this.isRunning) {
                Utils.window.webContents.send(`job-continue-${this.job.name}`, { job: this.job } );
                await inquirer.prompt(question);
            }
        }
    }

    private async checkOverviewPage() {
        const availableProducts = this.getAvailableProducts();
        if (availableProducts.length > 0) {
            try {
                Utils.playAlarm();
                await this.setupPage();
                if (this.job.magic) {
                    await this.checkout(availableProducts);
                } else {
                    await this.page.goto(this.job.url);
                    const allProducts = await this.page.$$('.direct-buy');
                    const buttons = [];
                    for (let p of allProducts) {
                        const title = await (await p.$('.shop-title')).evaluate(t => t.textContent);
                        const button = await p.$('.btn-shopping-cart');
                        this.job.productText.forEach(word => {
                            if (title.includes(word) && button) {
                                buttons.push(button);
                            }
                        });
                    }
                    await this.checkoutUsual(buttons);
                }
            } catch (e) {
                console.log('error while clicking for: ', e);
                writeFileSync(join(__dirname, `error_${this.job.name}.txt`), e, { encoding: 'utf-8' });
            }
            await inquirer.prompt(question);
        }
    }

    private async checkout(products: { id: string, title: string }[]) {
        let query = '';
        for (let product of products) {
            if (product.title.includes('5600')) {
                query += `&ProductID=${product.id}&ProductID=${product.id}`;
            } else {
                query += `&ProductID=${product.id}`;
            }
        }
        // https://shop.amd.com/store?Action=buy&Env=BASE&Locale=de_DE&ProductID=5458374000&SiteID=amd
        let alertInfo = true;
        while (alertInfo) {
            await this.page.goto(`https://shop.amd.com/store?Action=buy&Env=BASE&Locale=de_DE${query}&SiteID=amd`);
            let alert = await this.page.$('.alert-storeInfo');
            if (!alert) {
                alertInfo = false;
            } else {
                await timer(500).toPromise();
            }
        }
        Utils.playAlarm();
        const payPalCookies = getPayPalCookies();
        console.log(payPalCookies);
        await this.page.setCookie(...payPalCookies);

        let checkoutButton;
        if (this.billingInfo.type === BillingType.PAYPAL) {
            checkoutButton = await this.page.waitForSelector('#lnkPayPalExpressCheckout');
            await checkoutButton.click();
            const paypalbutton = await this.waitForDisabledButton('#payment-submit-btn', 'data-disabled');
            await paypalbutton.click();
        } else {
            checkoutButton = await this.page.waitForSelector('#dr_shoppingCartCheckoutButton');
            await checkoutButton.click();
            await this.enterDetailsAlternative();
    
            await this.page.evaluate(el => {
                const button = document.querySelector('#dr_cart-checkout-button');
                button.scrollIntoView();
            });
    
            checkoutButton = await this.waitForDisabledButton('#checkoutButton');
            await checkoutButton.click();
        }
    
        await this.page.waitForSelector('#dr_TermsOfSaleAcceptance label', { timeout: 180000 });
        const label = await this.page.$('#dr_TermsOfSaleAcceptance label');
        await label.click();
        checkoutButton = await this.page.$('#submitBottom');
        if (this.job.test) {
            console.log('will NOT do final click');
        } else {
            console.log('will DO final click');
            await checkoutButton.click();
        }
    }


    private waitForDisabledButton(identifier: string, propertyToCheck = 'disabled'): Promise<ElementHandle> {
        return new Promise(async (resolve, reject) => {
            let button = await this.page.waitForSelector(identifier);
            let solved = false;
            while(!solved) {
                button = await this.page.$(identifier);
                const disabled = await button.evaluate((el, propertyToCheck) => el.getAttribute(propertyToCheck), propertyToCheck);
                if (!disabled || disabled === 'false') {
                    solved = true;
                    await timer(500).toPromise();
                } else {
                    await timer(50).toPromise();
                }
            }
            resolve(button);
        });
    }

    
    private async closeModal(modalClosed): Promise<boolean> {
        if (modalClosed) {
            return true;
        }
        await timer(2000).toPromise();
        const feedBackButton = await this.page.$('#fsrFocusFirst');
        if (feedBackButton) {
            await feedBackButton.click();
            await timer(500).toPromise();
            return true;
        }
        return false;
    }

    private async enterDetails() {
        await this.page.waitForSelector('#card-expiration iframe');
        await this.sendKeysTo('card-number', 'ccNumber', this.billingInfo.ccNumber);
        await this.sendKeysTo('card-expiration', 'ccExpiry', this.billingInfo.ccExpire);
        await this.sendKeysTo('card-security-code', 'ccCVV', this.billingInfo.ccSecret);

        await setInput('edit-email', this.billingInfo.mail, this.page);
        await setInput('edit-phone-number', this.billingInfo.phone, this.page);
        await setInput('edit-first-name', this.billingInfo.firstName, this.page);
        await setInput('edit-last-name', this.billingInfo.lastName, this.page);
        await setInput('edit-shop-country', this.billingInfo.country, this.page);
        await setInput('edit-address-line', `${this.billingInfo.street} ${this.billingInfo.streetNr}`, this.page);
        await setInput('edit-city', this.billingInfo.city, this.page);
        await setInput('edit-postal-code', this.billingInfo.zip, this.page);
        await Promise.all([
            this.page.click('#edit-submit'),
            this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 300000 })
        ]);
    }

    private async sendKeysTo(id1, id2, value) {
        let done = false;
        while(!done) {
            try {
                const iframe = await this.page.waitForSelector(`#${id1} iframe`);
                await iframe.click();
                await timer(100).toPromise();
                await iframe.click();
                await timer(100).toPromise();
                await this.page.keyboard.type(value, { delay: 5 });
                done = true;
            } catch(e) {
                console.log('e');
                await timer(200).toPromise();
            }
        }
    }

    private async enterDetailsAlternative() {
        await setInput('billingName1', this.billingInfo.firstName, this.page);
        await setInput('billingName2', this.billingInfo.lastName, this.page);
        await setInput('billingAddress1', `${this.billingInfo.street} ${this.billingInfo.streetNr}`, this.page);
        await setInput('billingPostalCode', this.billingInfo.zip, this.page);
        await setInput('billingState', this.billingInfo.city, this.page);
        await setInput('billingCity', this.billingInfo.city, this.page);
        await setInput('email', this.billingInfo.mail, this.page);
        await setInput('billingPhoneNumber', this.billingInfo.phone, this.page);
    
        await setInput('ccNum', this.billingInfo.ccNumber, this.page);
        await setInput('ccMonth', this.billingInfo.ccMonth, this.page);
        await setInput('ccYear', this.billingInfo.ccYear, this.page);
        await setInput('cardSecurityCode', this.billingInfo.ccSecret, this.page);
    }
    
    private getAvailableProducts() {
        const $ = load(this.fetchedData);
        const allProducts = $('.direct-buy');
        const products = [];
        allProducts.each((i, p) => {
            const title = $('.shop-title', p).text();
            const button = $('.btn-shopping-cart', p);
            this.job.productText.forEach(word => {
                if (title.includes(word) && button.length > 0 && button.attr().href) {
                    products.push({title, id: button.attr().href.split('/add-to-cart/')[1]});
                }
            })
        });
        return products;
    }
    
    private async checkoutUsual(buttons) { 
        let modalClosed = false;
        await buttons[0].click();
        const checkoutButton = await this.page.waitForSelector('.btn-transparent-black.checkout');
        await Promise.all([
            checkoutButton.click(),
            this.page.waitForNavigation({ waitUntil: 'networkidle0' })
        ]);
        modalClosed = await this.closeModal(modalClosed);
        await this.enterDetails();
        modalClosed = await this.closeModal(modalClosed);
        const button = await this.page.waitForSelector('#shipping-address #edit-submit', { timeout: 300000 });
        await button.click();
        const input = await this.page.waitForSelector('#terms-and-conditions-check');
        modalClosed = await this.closeModal(modalClosed);
        await input.click();
        await this.page.waitForSelector('.g-recaptcha iframe');
        const success = await solveCaptcha(this.page);
        // const success = false;
        if (success) {
            const orderButton = await this.page.$('.confirm-order-btn');
            if (this.job.test) {
                console.log('will NOT do final click');
            } else {
                console.log('will DO final click');
                // await orderButton.click();
            }
        }
    }

}
