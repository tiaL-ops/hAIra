// HighlightExtension.js
import { Mark } from '@tiptap/core'

export const Highlight = Mark.create({
  name: 'highlight',

  addOptions() {
    return {
      HTMLAttributes: {
        style: 'background-color: #ffeb3b !important; padding: 1px 2px; border-radius: 2px; cursor: pointer;',
        class: 'text-highlight',
      },
    }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-comment-id'),
        renderHTML: attributes => {
          if (!attributes.commentId) {
            return {}
          }
          return {
            'data-comment-id': attributes.commentId,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
      {
        tag: 'span.text-highlight',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  },

  addCommands() {
    return {
      setHighlight: (attributes) => ({ commands, state, dispatch }) => {
        console.log('HighlightExtension: setHighlight called with:', attributes);
        const { from, to } = state.selection;
        console.log('HighlightExtension: Selection from', from, 'to', to);
        
        if (dispatch) {
          const tr = state.tr.addMark(from, to, state.schema.marks.highlight.create(attributes));
          dispatch(tr);
          return true;
        }
        return false;
      },
      toggleHighlight: (attributes) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes)
      },
      unsetHighlight: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
      removeHighlightByCommentId: (commentId) => ({ state, dispatch }) => {
        console.log('HighlightExtension: removeHighlightByCommentId called with:', commentId);
        
        if (dispatch) {
          const tr = state.tr;
          let hasChanges = false;
          
          // Remove all highlight marks with this commentId
          state.doc.descendants((node, pos) => {
            if (node.marks) {
              node.marks.forEach(mark => {
                if (mark.type.name === 'highlight' && mark.attrs.commentId === commentId) {
                  tr.removeMark(pos, pos + node.nodeSize, mark.type);
                  hasChanges = true;
                }
              });
            }
          });
          
          if (hasChanges) {
            dispatch(tr);
            console.log('HighlightExtension: Highlight removed for commentId:', commentId);
            return true;
          }
        }
        return false;
      },
    }
  },
})
