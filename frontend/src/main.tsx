import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f2e1a',
            color: '#fff',
            borderRadius: '10px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#52b788', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#e63946', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
