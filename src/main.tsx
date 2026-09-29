import { TDSMobileAITProvider } from '@toss/tds-mobile-ait';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './app/App';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TDSMobileAITProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TDSMobileAITProvider>
  </React.StrictMode>,
);
