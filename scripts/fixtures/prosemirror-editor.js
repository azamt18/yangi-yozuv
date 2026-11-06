// A real ProseMirror editor (the library behind chatgpt.com and claude.ai's
// message boxes), used by the browser test. Enter "sends" through ProseMirror's
// own keymap, the way those chat apps do.
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { schema } from 'prosemirror-schema-basic';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';

window.sent = [];
const view = new EditorView(document.getElementById('editor'), {
  state: EditorState.create({
    schema,
    plugins: [
      keymap({
        Enter: (state, dispatch) => {
          window.sent.push(state.doc.textContent);
          dispatch?.(state.tr.delete(0, state.doc.content.size));
          return true;
        },
      }),
      keymap(baseKeymap),
    ],
  }),
});
window.view = view;
