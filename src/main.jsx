import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import WriteErrorToast from './WriteErrorToast.jsx'
import { ThemeProvider } from './shared/ThemeContext.jsx'
import { ThemeSwitch } from './shared/ThemeSwitch.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
      <ThemeSwitch />
    </ThemeProvider>
    <WriteErrorToast />
  </StrictMode>,
)
