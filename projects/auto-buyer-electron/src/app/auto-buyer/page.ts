import puppeteer from 'puppeteer-extra';
import { PuppeteerExtraPluginRecaptcha } from "puppeteer-extra-plugin-recaptcha";
import { Browser, Page } from 'puppeteer-core';
import { screen } from 'electron';
import { twoCaptchaToken } from './sites/credentials';

const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
export const plugin: PuppeteerExtraPluginRecaptcha = RecaptchaPlugin({
  provider: {
    id: '2captcha',
    token: twoCaptchaToken, // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
  },
  visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
});
puppeteer.use(plugin)

export let browser: Browser;
export let usedTargets = new Set();

export async function setupPuppeteer() {
  const workAreaSize = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1280, workAreaSize.width || 1280);
  const height = Math.min(720, workAreaSize.height || 720);
  browser = await puppeteer.connect({
    browserURL: `http://localhost:45678`,
    defaultViewport: {
      width,
      height
    }
  });
}

export async function solveCaptcha(page: Page): Promise<boolean> {
  let { captchas, error } = await plugin.findRecaptchas(page);
  if (error) {
      console.log('Error at findRecaptchas(): ', error);
      return false;
  }
  console.log('solving captcha...');
  let { solutions, error2 } = await plugin.getRecaptchaSolutions(captchas);
  if (error2) {
      console.log('Error at getRecaptchaSolutions(): ', error2);
      return false;
  }
  console.log('entering captcha...');
  let result = await plugin.enterRecaptchaSolutions(page, solutions)
  if (result.error) {
      console.log('Error at enterRecaptchaSolutions(): ', result.error);
      return false;
  }
  console.log('succusful!');
  return true;
}
