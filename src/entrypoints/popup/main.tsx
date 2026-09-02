import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PopupApp } from '@/components/PopupApp';
import './style.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Popup root element is missing.');
}

createRoot(root).render(
  <StrictMode>
    <PopupApp />
  </StrictMode>,
);
