import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Forzar actualización automática de la PWA cuando hay una nueva versión
const updateSW = registerSW({
  onNeedRefresh() {
    // Actualizar inmediatamente cuando hay una nueva versión disponible
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[BloodCare] App lista para uso offline');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
