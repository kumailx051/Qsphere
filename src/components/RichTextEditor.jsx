import { useEffect, useRef } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Quote,
  RotateCcw,
  RotateCw,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Text,
  FileText,
} from 'lucide-react'

const editorShellClassName =
  'rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl overflow-hidden flex flex-col'

const toolbarButtonClassName = 'p-2 rounded hover:bg-white/5 transition-colors'

const RichTextEditor = ({
  value,
  onChange,
  placeholder = 'Click here to start composing your rich content...',
  minHeight = 450,
}) => {
  const editorRef = useRef(null)

  useEffect(() => {
    if (!editorRef.current) return
    const current = editorRef.current.innerHTML || ''
    if (current !== value) {
      editorRef.current.innerHTML = value || ''
    }
  }, [value])

  const syncChange = () => {
    if (!editorRef.current) return
    onChange(editorRef.current.innerHTML || '')
  }

  const execCmd = (command, commandValue = null) => {
    document.execCommand(command, false, commandValue)
    editorRef.current?.focus()
    syncChange()
  }

  return (
    <div className={editorShellClassName}>
      <div className="flex flex-wrap items-center gap-1 bg-[#0d120d] border-b border-white/10 p-2 text-white/80">
        <button type="button" onClick={() => execCmd('bold')} className={toolbarButtonClassName} title="Bold"><Bold size={15} /></button>
        <button type="button" onClick={() => execCmd('italic')} className={toolbarButtonClassName} title="Italic"><Italic size={15} /></button>
        <button type="button" onClick={() => execCmd('underline')} className={toolbarButtonClassName} title="Underline"><Underline size={15} /></button>
        <span className="w-[1px] h-5 bg-white/10 mx-1" />
        <button type="button" onClick={() => execCmd('insertUnorderedList')} className={toolbarButtonClassName} title="Bullet List"><List size={15} /></button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} className={toolbarButtonClassName} title="Numbered List"><ListOrdered size={15} /></button>
        <span className="w-[1px] h-5 bg-white/10 mx-1" />
        <button type="button" onClick={() => execCmd('formatBlock', '<h1>')} className={`${toolbarButtonClassName} font-bold text-xs`} title="Heading 1"><Heading1 size={15} /></button>
        <button type="button" onClick={() => execCmd('formatBlock', '<h2>')} className={`${toolbarButtonClassName} font-bold text-xs`} title="Heading 2"><Heading2 size={15} /></button>
        <button type="button" onClick={() => execCmd('formatBlock', '<h3>')} className={`${toolbarButtonClassName} font-bold text-xs`} title="Heading 3"><Heading3 size={15} /></button>
        <button type="button" onClick={() => execCmd('formatBlock', '<p>')} className={toolbarButtonClassName} title="Paragraph"><Text size={15} /></button>
        <button type="button" onClick={() => execCmd('formatBlock', '<blockquote>')} className={toolbarButtonClassName} title="Quote"><Quote size={15} /></button>
        <span className="w-[1px] h-5 bg-white/10 mx-1" />
        <button type="button" onClick={() => execCmd('justifyLeft')} className={toolbarButtonClassName} title="Align Left"><AlignLeft size={15} /></button>
        <button type="button" onClick={() => execCmd('justifyCenter')} className={toolbarButtonClassName} title="Align Center"><AlignCenter size={15} /></button>
        <button type="button" onClick={() => execCmd('justifyRight')} className={toolbarButtonClassName} title="Align Right"><AlignRight size={15} /></button>
        <button type="button" onClick={() => execCmd('justifyFull')} className={toolbarButtonClassName} title="Align Justify"><AlignJustify size={15} /></button>
        <span className="w-[1px] h-5 bg-white/10 mx-1" />
        <button type="button" onClick={() => execCmd('createLink', 'https://')} className={toolbarButtonClassName} title="Insert Link"><LinkIcon size={15} /></button>
        <span className="w-[1px] h-5 bg-white/10 mx-1" />
        <button type="button" onClick={() => execCmd('undo')} className={toolbarButtonClassName} title="Undo"><RotateCcw size={15} /></button>
        <button type="button" onClick={() => execCmd('redo')} className={toolbarButtonClassName} title="Redo"><RotateCw size={15} /></button>
        <button type="button" onClick={() => execCmd('removeFormat')} className={`${toolbarButtonClassName} text-red-300`} title="Clear Formatting"><Eraser size={15} /></button>
      </div>

      <div
        ref={editorRef}
        contentEditable="true"
        onInput={syncChange}
        onKeyUp={syncChange}
        onClick={syncChange}
        className="w-full bg-black/30 text-white p-6 leading-relaxed outline-none focus:bg-emerald-950/[0.02] transition-all prose prose-invert max-w-none"
        style={{ minHeight, overflowY: 'auto', fontFamily: "'Inter', sans-serif" }}
        data-placeholder={placeholder}
      />

      <div className="flex justify-between items-center bg-[#0d120d] border-t border-white/10 px-4 py-2 text-[10px] text-white/55 font-mono select-none">
        <div className="flex items-center gap-1">
          <FileText size={10} className="text-emerald-400" />
          <span>RICH TEXT EDITOR</span>
        </div>
        <div className="text-emerald-400/60">POWERED BY QSPHERE EDITOR</div>
      </div>
    </div>
  )
}

export default RichTextEditor