import React from 'react'
import { createRoot } from 'react-dom/client'
import './lib/storage.js' // installs window.storage (localStorage-backed) before the app reads it
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
