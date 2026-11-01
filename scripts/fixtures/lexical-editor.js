// A real Lexical editor (the library behind Instagram's message box), used by
// the browser test. Enter "sends" the message the way a Lexical chat app does:
// through Lexical's own Enter command, not a plain DOM listener.
import {
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  createEditor,
} from 'lexical';
import { registerPlainText } from '@lexical/plain-text';

const root = document.getElementById('editor');
const editor = createEditor({
  namespace: 'e2e',
  onError: (error) => {
    throw error;
  },
});
editor.setRootElement(root);
registerPlainText(editor);

window.sent = [];
editor.registerCommand(
  KEY_ENTER_COMMAND,
  (event) => {
    event?.preventDefault();
    const content = $getRoot();
    window.sent.push(content.getTextContent());
    content.clear();
    return true;
  },
  COMMAND_PRIORITY_HIGH,
);
