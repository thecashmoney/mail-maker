import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId = "348073828150-3tm7tsfgg51bm266t902nomfliad9qmo.apps.googleusercontent.com">
    <StrictMode>
      <App />
    </StrictMode>
  </GoogleOAuthProvider>,
)