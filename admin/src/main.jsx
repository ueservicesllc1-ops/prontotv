import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Desregistrar cualquier service worker que pueda estar interfiriendo
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister().then(success => {
        if (success) {
          console.log('✅ Service Worker desregistrado')
        }
      })
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

