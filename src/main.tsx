import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FAVICON } from './components/Brand';
import './styles/index.css';

/*
 * The tab icon is generated from the same SVG the header draws, so the
 * mark has exactly one definition. Change Brand.tsx and this follows,
 * instead of quietly staying the old one until somebody re-exports a png.
 */
const icon = document.createElement('link');
icon.rel = 'icon';
icon.type = 'image/svg+xml';
icon.href = FAVICON;
document.head.appendChild(icon);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
