import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { APP_BASE_PATH } from './utils/constants'

const params = new URLSearchParams(window.location.search);
const recover = params.get('_r');

if (recover) {
  const url = new URL(decodeURIComponent(recover), window.location.origin);

  params.delete('_r');
  const search = params.toString();
  window.history.replaceState(
    null,
    '',
    APP_BASE_PATH.replace(/\/+$/, '') + url.pathname + (search ? '?' + search : '') + url.hash
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
