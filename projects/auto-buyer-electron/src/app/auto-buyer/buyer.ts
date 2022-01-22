import { from, timer } from 'rxjs';
import { timeout } from 'rxjs/operators';
import fetch from 'node-fetch';
import { Billing, Job } from '@auto-buyer-shared/types';
import { Page, SetCookie } from 'puppeteer-core';
import { screen, LoadURLOptions, BrowserWindow, session } from 'electron';
import { browser, usedTargets } from './page';
import { getBillings, Utils } from './util';


export const defaultHeaders: any = {
  'Accept': '*/*',
  'Accept-Language': 'de,en;q=0.9,pl;q=0.8,nl;q=0.7,de-CH;q=0.6,de-LI;q=0.5',
  'content-length': '0',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36',
  'Connection': 'keep-alive'
};

export abstract class BuyerJob {
  protected page: Page;
  protected fetchedData;
  protected headers = { ...defaultHeaders };
  protected billingInfo: Billing;
  protected isRunning = false;
  public targetId: string;
  private win: BrowserWindow;

  constructor(public job: Job) {
    if (this.job['user-agent']) {
      this.headers['user-agent'] = this.job['user-agent'];
    }
    if (this.job.cookies) {
      this.headers.cookie = this.job.cookies;
    }
    this.billingInfo = getBillings().find(b => b.name === this.job.billingName);
  }

  abstract run(): Promise<any>;

  public async stop() {
    this.isRunning = false;
    usedTargets.delete(this.targetId);
    if (this.win) {
      this.win.close();
      this.win.destroy();
      this.win = null;
    }
  }

  protected async fetchData(timeoutInMs = 3000, getRaw = false) {
    const waitInMs = (Math.ceil(Math.random() * 2) * 1000 + this.job.waitTime ? this.job.waitTime : 1000);
    await timer(waitInMs).toPromise();
    if (this.job.host) {
      this.headers.host = this.job.host;
    }

    const res = await from(fetch(this.job.url, { follow: 2, headers: this.headers })).pipe(
      timeout(timeoutInMs)
    ).toPromise();
    if (res.status !== 200 && res.status !== 503 && res.status !== 404) {
      Utils.window.webContents.send(`job-status-${this.job.name}`, { job: this.job, status: res.status })
      this.fetchedData = '';
    } else {
      Utils.window.webContents.send(`job-tick-${this.job.name}`, this.job);
      this.fetchedData = getRaw ? res : await res.text();
    }
  }

  protected async setupPage() {
    const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
    const width = Math.min(1280, workAreaSize.width || 1280);
    const height = Math.min(720, workAreaSize.height || 720);
    const options: LoadURLOptions = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4298.0 Safari/537.36'
    }

    const random = Math.round(Math.random() * 10000);
    session.fromPartition(`persist:${this.job.name}_${random}`);
    this.win = new BrowserWindow(
      { width,
        height,
        x: (usedTargets.size === 0 || usedTargets.size === 2) ? 0 : 1280,
        y: (usedTargets.size === 0 || usedTargets.size === 1) ? 0 : 720,
        webPreferences: {
          partition: `persist:${this.job.name}_${random}`
        } 
    });
    await this.win.loadURL(`about:blank?jobname=${this.job.name}`, options);

    const targets = await browser.targets();
    let target = targets.find((t: any) => {
      return t.url().split('jobname=')[1] === this.job.name && !usedTargets.has(t._targetId);
    });
    this.targetId = (target as any)._targetId;
    usedTargets.add(this.targetId);

    this.page = await target.page();
    let jobCookies = this.job.cookies || [];
    let paypalCookies = this.billingInfo.cookies || [];
    const allCookies = jobCookies.concat(paypalCookies);
    if (allCookies.length > 0) {
      const setCookies: SetCookie[] = [];
      for (const cookie of allCookies) {
        setCookies.push({ name: cookie.name, value: cookie.value, domain: cookie.domain });
      }
      await this.page.setCookie(...setCookies);
    }
  }
}
