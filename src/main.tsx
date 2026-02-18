import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './skills'  // Register all skills at startup
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
