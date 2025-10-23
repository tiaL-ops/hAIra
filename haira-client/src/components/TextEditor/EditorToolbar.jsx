// EditorToolbar.jsx
import React, { useState } from 'react'
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  HelpCircle,
} from 'lucide-react'

export default function EditorToolbar({ editor }) {
  const [open, setOpen] = useState(false)
  if (!editor) return null

  const Button = ({ onClick, isActive, children, title }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md hover:bg-[#a74e53] transition text-sm ${
        isActive ? 'bg-[#a74e53]/60 font-semibold text-white' : 'text-white'
      }`}
    >
      {children}
    </button>
  )

  const toggleHeading = (level) => {
    editor.chain().focus().toggleHeading({ level }).run()
    setOpen(false)
  }

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1'
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2'
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3'
    return 'Normal text'
  }

  return (
    <div className="flex flex-nowrap gap-2 items-center border-b border-gray-200 p-2 rounded-t-lg relative bg-[#B4565A] overflow-x-auto">
      {/* Heading dropdown */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#933d42] text-white hover:bg-[#933d42] font-[Jersey_10] text-sm"
        >
          <span>{getCurrentHeading()}</span>
          <ChevronDown size={14} />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-md rounded z-10 w-36">
            <button
              className="block px-3 py-1 text-left w-full hover:bg-gray-100 font-[Jersey_10] text-sm"
              onClick={() => toggleHeading(1)}
            >
              <Heading1 size={12} className="inline mr-1" /> Heading 1
            </button>
            <button
              className="block px-3 py-1 text-left w-full hover:bg-gray-100 font-[Jersey_10] text-sm"
              onClick={() => toggleHeading(2)}
            >
              <Heading2 size={12} className="inline mr-1" /> Heading 2
            </button>
            <button
              className="block px-3 py-1 text-left w-full hover:bg-gray-100 font-[Jersey_10] text-sm"
              onClick={() => toggleHeading(3)}
            >
              <Heading3 size={12} className="inline mr-1" /> Heading 3
            </button>
            <button
              className="block px-3 py-1 text-left w-full hover:bg-gray-100 font-[Jersey_10] text-sm"
              onClick={() => editor.chain().focus().setParagraph().run()}
            >
              Normal text
            </button>
          </div>
        )}
      </div>

      {/* Formatting buttons - all in one line with better spacing */}
      <div className="flex gap-2 ml-2 flex-nowrap">
        <Button onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
          <Bold size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
          <Italic size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
          <Underline size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
          <AlignLeft size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
          <AlignCenter size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
          <AlignRight size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
          <List size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote">
          <Quote size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={14} />
        </Button>
        <Button onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={14} />
        </Button>
        
        {/* Help button */}
        <div className="toolbar-divider"></div>
      </div>
    </div>
  )
}