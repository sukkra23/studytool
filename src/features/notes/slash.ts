import { Extension, type Editor, type Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { create } from 'zustand';
import { saveImage } from '../../db/images';
import { pickFile } from '../../lib/download';

export interface SlashItem {
  title: string;
  hint: string;
  icon: string;
  keywords: string;
  run: (editor: Editor, range: Range) => void;
}

export async function insertImages(editor: Editor, files: Blob[]) {
  const ids = await Promise.all(files.map((f) => saveImage(f)));
  editor
    .chain()
    .focus()
    .insertContent(ids.map((imageId) => ({ type: 'blobImage', attrs: { imageId } })))
    .run();
}

const block = (editor: Editor, range: Range) => editor.chain().focus().deleteRange(range);

export const SLASH_ITEMS: SlashItem[] = [
  { title: 'Text', hint: 'Plain paragraph', icon: '¶', keywords: 'paragraph plain', run: (e, r) => block(e, r).setParagraph().run() },
  { title: 'Heading 1', hint: 'Big section heading', icon: 'H1', keywords: 'h1 title', run: (e, r) => block(e, r).setNode('heading', { level: 1 }).run() },
  { title: 'Heading 2', hint: 'Medium section heading', icon: 'H2', keywords: 'h2 subtitle', run: (e, r) => block(e, r).setNode('heading', { level: 2 }).run() },
  { title: 'Heading 3', hint: 'Small section heading', icon: 'H3', keywords: 'h3', run: (e, r) => block(e, r).setNode('heading', { level: 3 }).run() },
  { title: 'Bullet list', hint: 'Simple bulleted list', icon: '•', keywords: 'unordered ul', run: (e, r) => block(e, r).toggleBulletList().run() },
  { title: 'Numbered list', hint: 'List with numbering', icon: '1.', keywords: 'ordered ol', run: (e, r) => block(e, r).toggleOrderedList().run() },
  { title: 'To-do list', hint: 'Track tasks with checkboxes', icon: '☑', keywords: 'todo task checkbox', run: (e, r) => block(e, r).toggleTaskList().run() },
  { title: 'Quote', hint: 'Capture a quote', icon: '❝', keywords: 'blockquote', run: (e, r) => block(e, r).toggleBlockquote().run() },
  { title: 'Code', hint: 'Code block', icon: '</>', keywords: 'codeblock pre', run: (e, r) => block(e, r).toggleCodeBlock().run() },
  { title: 'Divider', hint: 'Horizontal line', icon: '—', keywords: 'hr rule line', run: (e, r) => block(e, r).setHorizontalRule().run() },
  {
    title: 'Image',
    hint: 'Upload a picture (or just paste one)',
    icon: '🖼',
    keywords: 'picture photo',
    run: (e, r) => {
      block(e, r).run();
      void pickFile('image/*').then((f) => f && insertImages(e, [f]));
    },
  },
  {
    title: 'Table',
    hint: '3 × 3 table with a header row',
    icon: '▦',
    keywords: 'grid',
    run: (e, r) => block(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  { title: 'Callout', hint: 'Make a note stand out', icon: '💡', keywords: 'note info tip highlight', run: (e, r) => block(e, r).toggleWrap('callout').run() },
];

interface SlashState {
  open: boolean;
  items: SlashItem[];
  index: number;
  rect: DOMRect | null;
  select: (item: SlashItem) => void;
}

/** State of the "/" menu; written by the TipTap plugin below, rendered by <SlashMenu />. */
export const useSlashStore = create<SlashState>(() => ({
  open: false,
  items: [],
  index: 0,
  rect: null,
  select: () => {},
}));

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addProseMirrorPlugins() {
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        char: '/',
        allowSpaces: false,
        items: ({ query }) => {
          const q = query.toLowerCase();
          return SLASH_ITEMS.filter((i) => `${i.title} ${i.keywords}`.toLowerCase().includes(q));
        },
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => ({
          onStart: (props) =>
            useSlashStore.setState({
              open: true,
              items: props.items,
              index: 0,
              rect: props.clientRect?.() ?? null,
              select: (item) => props.command(item),
            }),
          onUpdate: (props) =>
            useSlashStore.setState({
              items: props.items,
              index: 0,
              rect: props.clientRect?.() ?? null,
              select: (item) => props.command(item),
            }),
          onKeyDown: ({ event }) => {
            const s = useSlashStore.getState();
            if (!s.open) return false;
            if (event.key === 'Escape') {
              useSlashStore.setState({ open: false });
              return true;
            }
            if (!s.items.length) return false;
            if (event.key === 'ArrowDown') {
              useSlashStore.setState({ index: (s.index + 1) % s.items.length });
              return true;
            }
            if (event.key === 'ArrowUp') {
              useSlashStore.setState({ index: (s.index - 1 + s.items.length) % s.items.length });
              return true;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
              s.select(s.items[s.index]);
              return true;
            }
            return false;
          },
          onExit: () => useSlashStore.setState({ open: false }),
        }),
      }),
    ];
  },
});
