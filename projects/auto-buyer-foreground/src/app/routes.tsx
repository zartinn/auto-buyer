import { lazy } from "react";

const Home  = lazy(() => import("./components/content/home/Home")) ;

export const routes = [
    { path: '/home', component: Home },
];
