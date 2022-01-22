import { useState } from "react";
import { Billing } from '@auto-buyer-shared/types';


export function useBilling(initialValue) {
    const [billing, setBilling] = useState(() => {
        window.electron.invoke("get-billing").then((billing) => {
            return billing;
        });
        return null;
    });


    return [billing, setBilling];
}