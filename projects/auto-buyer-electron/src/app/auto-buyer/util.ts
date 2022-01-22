import { Billing, Job } from '@auto-buyer-shared/types';
import { BrowserWindow } from 'electron';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { ensureFileSync } from 'fs-extra';
import { join, resolve } from 'path';
import { Page } from 'puppeteer-core';
const player = require('sound-play');


export class Utils {
  static appDataPath: string;
  static applicationPath: string;
  static soundPath: string;
  static window: BrowserWindow;

  static playAlarm() {
    player.play(resolve(Utils.applicationPath, 'assets', 'sound.wav'));
  }
}

export async function setCookies(cookies, page) {
  await (page as any).setCookie(...cookies);
}


export function getJobs() {
    const jobFileLocation = join(Utils.appDataPath, 'auto-buyer', 'jobs.json');
    let jobs: Job[] = []
    if (existsSync(jobFileLocation)) {
        jobs = JSON.parse(readFileSync(jobFileLocation, { encoding: 'utf-8'}));
    }
    return jobs;
}

export function saveJobs(jobs: Job[]) {
    const jobFileLocation = join(Utils.appDataPath, 'auto-buyer', 'jobs.json');
    ensureFileSync(jobFileLocation);
    writeFileSync(jobFileLocation, JSON.stringify(jobs), { encoding: 'utf-8' });
}

export function saveBillings(billings: Billing[]) {
    const billingFileLocation = join(Utils.appDataPath, 'auto-buyer', 'billing.json');
    ensureFileSync(billingFileLocation);
    writeFileSync(billingFileLocation, JSON.stringify(billings), { encoding: 'utf-8' });
}

export function getBillings() {
  const billingFileLocation =  join(Utils.appDataPath, 'auto-buyer', 'billing.json');
  let billing: Billing[] = [];
  if (existsSync(billingFileLocation)) {
    billing = JSON.parse(readFileSync(billingFileLocation, { encoding: 'utf-8'}));
  }
  return billing;
}

export function getPayPalCookies() {
  const paypalFileLocation =  join(Utils.appDataPath, 'auto-buyer', 'paypal.json');
  let paypal = [];
  if (existsSync(paypalFileLocation)) {
    paypal = JSON.parse(readFileSync(paypalFileLocation, { encoding: 'utf-8'}));
  }
  return paypal;
}

export const question = [
  {
    name: "confirm this",
    type: "confirm",
    message: "Go on?",
  },
];

export async function setInput(id, value, page: Page) {
  const input = await page.waitForSelector(`#${id}`);
  await input.click({ clickCount: 1 });
  await page.keyboard.type(value);
}
