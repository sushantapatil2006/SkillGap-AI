import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './src/App'
import { AuthProvider } from './src/context/AuthContext'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
