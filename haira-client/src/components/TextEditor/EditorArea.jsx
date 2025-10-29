// EditorArea.jsx
import React, { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Highlight as TipTapHighlight } from '@tiptap/extension-highlight'
import { FloatingMenu, BubbleMenu } from '@tiptap/react/menus'
import { Highlight } from './HighlightExtension'

export default function EditorArea({ content = '', onChange, editable = true, editorRef, placeholder = 'Start writing your project here...', highlightedRanges = [], onHighlightClick }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ 
        placeholder: 'Start writing your project here...\n\nYou can use headings, lists, and formatting to structure your content.',
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      TipTapHighlight,
      Highlight,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      if (onChange) onChange(html)
    },
  })

  useEffect(() => {
    if (editorRef) editorRef.current = editor
  }, [editor, editorRef])

  // Apply highlights when highlightedRanges change
  useEffect(() => {
    if (!editor || !highlightedRanges.length) return

    
    // Don't clear existing highlights - just add new ones
    // editor.commands.unsetHighlight()

    // Apply new highlights one by one
    highlightedRanges.forEach((range, index) => {
      if (range.start < range.end) {
        // Use setTimeout to ensure highlights are applied sequentially
        setTimeout(() => {
          editor.commands.setTextSelection({ from: range.start, to: range.end })
          const success = editor.commands.setHighlight({ commentId: range.commentId })
          
          // Don't clear selection immediately - let the highlight stay
          // editor.commands.setTextSelection({ from: 0, to: 0 })
        }, index * 100) // Increased delay to ensure proper application
      }
    })
  }, [editor, highlightedRanges])

  if (!editor) return null

  return (
    <>
      <div className="relative flex flex-col w-full h-full bg-white border-2 border-[#B4565A] rounded-lg overflow-hidden shadow-lg">
        <div className="flex-1 flex flex-col">
          <div className="editor-content-wrapper">
            <EditorContent
              editor={editor}
              className="editor-content"
              onClick={(e) => {
                // Handle clicks on highlighted text
                const target = e.target;
                if (target.classList.contains('text-highlight') || target.closest('.text-highlight')) {
                  const highlightElement = target.classList.contains('text-highlight') ? target : target.closest('.text-highlight');
                  const commentId = highlightElement.getAttribute('data-comment-id');
                  if (commentId && onHighlightClick) {
                    onHighlightClick(commentId);
                  }
                }
              }}
            />
            
            {/* Floating Menu - appears when you click on empty lines */}
            <FloatingMenu editor={editor}>
              <div className="floating-menu">
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                  className="floating-menu-btn"
                >
                  H1
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className="floating-menu-btn"
                >
                  H2
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                  className="floating-menu-btn"
                >
                  H3
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  className="floating-menu-btn"
                >
                  • List
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                  className="floating-menu-btn"
                >
                  1. List
                </button>
              </div>
            </FloatingMenu>
            
            {/* Bubble Menu - appears when you select text */}
            <BubbleMenu editor={editor}>
              <div className="bubble-menu">
                {/* Text Formatting */}
                <div className="bubble-menu-group">
                  <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    className={`bubble-menu-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
                    title="Bold"
                  >
                    <strong>B</strong>
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    className={`bubble-menu-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
                    title="Italic"
                  >
                    <em>I</em>
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`bubble-menu-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
                    title="Underline"
                  >
                    <u>U</u>
                  </button>
                </div>
                
                <div className="bubble-menu-divider"></div>
                
                {/* Text Alignment */}
                <div className="bubble-menu-group">
                  <button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`bubble-menu-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
                    title="Align Left"
                  >
                    ⬅️
                  </button>
                  <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`bubble-menu-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
                    title="Align Center"
                  >
                    ↔️
                  </button>
                  <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`bubble-menu-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
                    title="Align Right"
                  >
                    ➡️
                  </button>
                  <button
                    onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                    className={`bubble-menu-btn ${editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}`}
                    title="Justify"
                  >
                    ⬌
                  </button>
                </div>
                
                <div className="bubble-menu-divider"></div>
                
                {/* Lists and Structure */}
                <div className="bubble-menu-group">
                  <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`bubble-menu-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
                    title="Bullet List"
                  >
                    •
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`bubble-menu-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
                    title="Numbered List"
                  >
                    1.
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`bubble-menu-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
                    title="Quote"
                  >
                    "
                  </button>
                </div>
                
                <div className="bubble-menu-divider"></div>
                
                {/* Headings */}
                <div className="bubble-menu-group">
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`bubble-menu-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
                    title="Heading 1"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`bubble-menu-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`bubble-menu-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
                    title="Heading 3"
                  >
                    H3
                  </button>
                </div>
              </div>
            </BubbleMenu>
          </div>
        </div>
      </div>
    </>
  )
}