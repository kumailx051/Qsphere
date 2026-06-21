import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { dayTheme, darkTheme } from '../themeColors'

export default function GlobalSnackbar() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState('success')
  const { theme } = useTheme()
  const isDayMode = theme === 'light'
  const palette = isDayMode ? dayTheme : darkTheme

  useEffect(() => {
    const handleShowSnackbar = (event) => {
      setMessage(event.detail.message)
      setType(event.detail.type || 'success')
      setOpen(true)
    }

    window.addEventListener('qsphere-snackbar', handleShowSnackbar)
    return () => window.removeEventListener('qsphere-snackbar', handleShowSnackbar)
  }, [])

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setOpen(false)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [open, message])

  if (!open) return null

  const isSuccess = type === 'success'

  const bgColor = isSuccess
    ? (isDayMode ? 'rgba(240, 253, 244, 0.97)' : 'rgba(8,18,13,0.95)')
    : (isDayMode ? 'rgba(254, 242, 242, 0.97)' : 'rgba(26,11,11,0.95)')
  
  const borderColor = isSuccess
    ? (isDayMode ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.3)')
    : (isDayMode ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.3)')
  
  const textColor = isSuccess
    ? (isDayMode ? '#047857' : '#34d399')
    : (isDayMode ? '#dc2626' : '#f87171')

  const shadow = isDayMode
    ? '0 8px 30px rgba(0,0,0,0.12)'
    : '0 8px 30px rgba(0,0,0,0.5)'

  return (
    <div className="fixed top-24 right-6 z-[9999] animate-in slide-in-from-top-5 fade-in duration-300">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md"
        style={{ backgroundColor: bgColor, borderColor, color: textColor, boxShadow: shadow }}
      >
        {isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        <span className="font-semibold text-sm">{message}</span>
        <button 
          onClick={() => setOpen(false)}
          className="ml-2 p-1 rounded-lg transition-colors"
          style={{ color: textColor }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
