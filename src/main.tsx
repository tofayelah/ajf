import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <div id="diagnostic-header" style={{background: 'yellow', padding: '10px', color: 'black', zIndex: 9999, position: 'relative'}}>
        AJF Welfare ERP Runtime OK
      </div>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
