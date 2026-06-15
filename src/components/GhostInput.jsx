import { useState, useRef, useEffect } from 'react'

export default function GhostInput({
  value,
  onChange,
  placeholder = '',
  className = '',
  context = ''
}) {
  const [suggestion, setSuggestion] = useState('')
  const inputRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (!value.trim()) {
      setSuggestion('')
      return
    }

    // Only suggest if the user's cursor is at the end
    // (We assume cursor is at end if they are typing, but we'll check broadly)
    const isAtEnd = inputRef.current && inputRef.current.selectionStart === value.length
    if (!isAtEnd) {
      setSuggestion('')
      return
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/ai/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: value, context })
        })
        if (res.ok) {
          const data = await res.json()
          setSuggestion(data.suggestion || '')
        }
      } catch (err) {
        console.error('Failed autocomplete', err)
      }
    }, 500)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [value, context])

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault()
      // Only append if there's a space or if it smoothly connects
      // The AI might return something like " to do XYZ"
      let newText = value
      if (suggestion.startsWith(' ') || value.endsWith(' ') || /^[.,!?:;]/.test(suggestion)) {
        newText += suggestion
      } else {
        newText += ' ' + suggestion
      }
      onChange(newText)
      setSuggestion('')
    }
  }

  // Calculate the hidden text width to position the suggestion
  const getHiddenText = () => value

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setSuggestion('')
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} relative z-10 bg-transparent outline-none`}
      />
      {suggestion && (
        <div 
          className="absolute inset-0 pointer-events-none flex items-center overflow-hidden whitespace-pre"
          style={{ paddingLeft: '1rem', paddingRight: '1rem' }} // match px-4
        >
          <span className="opacity-0">{getHiddenText()}</span>
          <span className="text-white/30 italic">{suggestion.startsWith(' ') ? suggestion : ' ' + suggestion}</span>
        </div>
      )}
    </div>
  )
}
