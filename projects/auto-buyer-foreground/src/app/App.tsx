import { Suspense, useEffect, useState } from 'react';
import './App.scss';
import { Redirect, Route } from 'react-router-dom';
import { routes } from './routes';
import { Header } from './components/header/Header';
import { Billing } from '@auto-buyer-shared/types';
import { BillingContext } from './shared/BillingContext';

export default function App() {
  const allRoutes = routes.map((route, index) => <Route key={index} exact path={route.path} component={route.component}></Route>);
  const [billings, setBillings] = useState<Billing[]>([]);

  useEffect(() => {
    window.electron.invoke('get-billings').then((billings) => {
      console.log('billings: ', billings);
      setBillings(() => billings);
    });
    setTimeout(() => {console.log('billings: ', billings)}, 2000);
  }, []);

  return (
    <div className="app">
      <BillingContext.Provider value={{billings, setBillings}}>
        <Header></Header>
        <Route exact path="/">
          <Redirect to={routes[0].path}></Redirect>
        </Route>
        <Suspense fallback={<div>Loading...</div>}>
          {allRoutes}
        </Suspense>
      </BillingContext.Provider>
    </div>
  );
}