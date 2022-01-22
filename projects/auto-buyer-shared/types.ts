import { asusCookies } from './cookies/asus';

export enum Platform {
    AMAZON = 'Amazon',
    AMD = 'AMD',
    NBB = 'NBB',
    ASUS = 'ASUS',
    NVIDIA = 'NVIDIA',
    CUSTOM = 'CUSTOM'
}

export enum BillingType {
    CREDIT_CARD = 'creditcard',
    PAYPAL = 'paypal'
}

export interface Billing {
    type?: BillingType,
    login?: string,
    pw?: string,
    name?: string,
    firstName?: string,
    lastName?: string,
    city?: string,
    country?: string[],
    zip?: string,
    street?: string,
    streetNr?: string,
    mail?: string,
    phone?: string,
    ccNumber?: string,
    ccExpire?: string,
    ccSecret?: string,
    ccMonth?: string,
    ccYear?: string,
    cookies?: Array<{[key: string]: any}>
}

export interface InputObj {
    placeholder: string,
    key: string,
}

export const billingInputs: InputObj[] = [
    { key: 'name', placeholder: 'name identifier for billing (must be unique)'},
    { key: 'firstName', placeholder: 'First name'},
    { key: 'lastName', placeholder: 'Last name'},
    { key: 'city', placeholder: 'City'},
    { key: 'zip', placeholder: 'Zip code'},
    { key: 'country', placeholder: 'Country'},
    { key: 'street', placeholder: 'Street'},
    { key: 'streetNr', placeholder: 'Street number'},
    { key: 'mail', placeholder: 'E-Mail'},
    { key: 'phone', placeholder: 'Phone number'},
    { key: 'ccNumber', placeholder: 'Credit card number'},
    { key: 'ccExpire', placeholder: 'Credit card expire date in MMYY'},
    { key: 'ccSecret', placeholder: 'Credit card secret number'},
]

export const jobInputs: InputObj[] = [
    { key: 'name', placeholder: 'Job name (must be unique)'},
    { key: 'url', placeholder: 'url to watch'},
    { key: 'maxPrice', placeholder: 'Maximum Price'},
    { key: 'productText', placeholder: 'Product text. Seperate multiple products by ;'},
]

export interface BaseJobProps {
    platform: Platform,
    host: string,
    id?: string,
    cookies?: any,
}

export const PlatformArr: Platform[] = Object.keys(Platform).map(key => Platform[key]);

export interface Job extends BaseJobProps {
  name?: string,
  url?: string,
  productText?: string[],
  maxPrice?: number,
  cookies?: Array<{[key: string]: any}>,
  magic?: boolean,
  waitTime?: number,
  useragent?: string,
  id?: string,
  running?: boolean,
  test?: boolean,
  billingName?: string,
}

export const amazonConstants: BaseJobProps = {
    host: 'www.amazon.de',
    platform: Platform.AMAZON
}

export function amdConstants(url: string, magic: boolean): BaseJobProps {
    const idRegex = url.match(/[0-9]+/);
    let id;
    if (idRegex) {
        id = idRegex[0];
    }

    return {
        host: magic ? 'shop.amd.com' : 'www.amd.com',
        platform: Platform.AMD,
        id,
        cookies: [
            {
                "domain": "shop.amd.com",
                "value": "2021-01-17T11:47:27.342Z",
                "name": "OptanonAlertBoxClosed"
            },
            {
                "domain": "shop.amd.com",
                "value": "de",
                "name": "pmuser_country"
            },
            {
                "domain": "shop.amd.com",
                "value": "true",
                "name": "cookieCompliance"
            }
        ]
    }
}

export const asusConstants: BaseJobProps = {
    host: 'www.webshop.asus.com',
    platform: Platform.ASUS,
    cookies: asusCookies
}

export const nbbConstants: BaseJobProps = {
    host: 'www.notebooksbilliger.de',
    platform: Platform.NBB
}


export const nvidiaConstants: BaseJobProps = {
    host: 'api.nvidia.partners',
    platform: Platform.NVIDIA
}

export const customConstants: BaseJobProps = {
    platform: Platform.CUSTOM,
    host: 'www.notebooksbilliger.de'
}

export function getPlatformInfo(platform: string, url: string, magic: boolean) {
    switch (platform) {
        case Platform.AMAZON: return amazonConstants;
        case Platform.AMD: return amdConstants(url, magic);
        case Platform.NBB: return nbbConstants;
        case Platform.NVIDIA: return nvidiaConstants;
        case Platform.ASUS: return asusConstants;
        case Platform.CUSTOM: return customConstants;
        default: return null;
    }
}