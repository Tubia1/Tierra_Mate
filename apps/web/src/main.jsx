import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { CartProvider } from './cart/CartContext.jsx';
import './styles/global.css';
import { StoreSettingsProvider } from './store/StoreSettingsContext.jsx';

createRoot(document.getElementById('root')).render(<StrictMode><StoreSettingsProvider><CartProvider><App /></CartProvider></StoreSettingsProvider></StrictMode>);
