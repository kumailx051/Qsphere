import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

export default function GlobalSnackbar() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState('success')

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

  return (
    <div className="fixed top-24 right-6 z-[9999] animate-in slide-in-from-top-5 fade-in duration-300">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] border backdrop-blur-md ${
        isSuccess 
          ? 'bg-[#08120d]/95 border-emerald-500/30 text-emerald-400' 
          : 'bg-[#1a0b0b]/95 border-red-500/30 text-red-400'
      }`}>
        {isSuccess ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
        <span className="font-semibold text-sm">{message}</span>
        <button 
          onClick={() => setOpen(false)}
          className={`ml-2 p-1 rounded-lg transition-colors ${
            isSuccess ? 'hover:bg-emerald-500/20' : 'hover:bg-red-500/20'
          }`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
