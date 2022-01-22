import { Billing } from '@auto-buyer-shared/types';
import { createContext } from 'react';

export const BillingContext = createContext<{billings: Billing[], setBillings: any}>(null);