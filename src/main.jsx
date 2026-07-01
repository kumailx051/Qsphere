import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyFontPreference, applyFontScales, getStoredFontScales, applyGlobalFontSettings, startGlobalFontSettingsSync } from './utils/fontPreference'
import App from './App.jsx'

applyGlobalFontSettings().then((applied) => {
  if (!applied) {
    applyFontPreference()
    applyFontScales(getStoredFontScales())
  }
})

startGlobalFontSettingsSync()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
