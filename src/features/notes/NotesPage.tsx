import { useEffect, useRef } from 'react';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';
import { useChapterStore } from '../../store/chapterStore';
import { imagesFromClipboard } from '../../lib/download';
import { BlobImage, Callout } from './extensions';
import { SlashCommand, insertImages, useSlashStore } from './slash';
import { SlashMenu } from './SlashMenu';

export default function NotesPage() {
  const initial = useRef(useChapterStore.getState().chapter!.notes);
  const title = useChapterStore((s) => s.chapter!.notes.title);
  const setNotes = useChapterStore((s) => s.setNotes);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === 'heading' ? 'Heading' : "Write something, or press '/' for blocks…"),
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      BlobImage,
      SlashCommand,
      GlobalDragHandle.configure({ dragHandleWidth: 22, scrollTreshold: 80 }),
    ],
    content: (initial.current.doc as JSONContent | null) ?? '',
    editorProps: {
      attributes: { class: 'prose-lite min-h-[50vh] pb-40 text-[15.5px] leading-7', 'aria-label': 'Notes' },
      handlePaste: (_view, event) => {
        const files = imagesFromClipboard(event.clipboardData);
        if (!files.length || !editorRef.current) return false;
        void insertImages(editorRef.current, files);
        return true;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
        if (!files.length || !editorRef.current) return false;
        event.preventDefault();
        void insertImages(editorRef.current, files);
        return true;
      },
    },
    // Autosave: every edit goes straight to the chapter store, which writes to IndexedDB.
    onUpdate: ({ editor: e }) => setNotes({ doc: e.getJSON() }),
  });
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => () => useSlashStore.setState({ open: false }), []);

  // Grow the title box with its content.
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  const inTable = editor?.isActive('table') ?? false;
  const tableBtn = (label: string, run: () => void) => (
    <button
      className="rounded px-2 py-1 text-xs text-muted hover:bg-panel hover:text-ink"
      onMouseDown={(e) => {
        e.preventDefault();
        run();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto bg-surface" data-notes>
      <div className="mx-auto max-w-[820px] px-12 pb-24 pt-16 sm:px-24">
        <textarea
          ref={titleRef}
          rows={1}
          value={title}
          onChange={(e) => setNotes({ title: e.target.value.replace(/\n/g, ' ') })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
              e.preventDefault();
              editor?.commands.focus('start');
            }
          }}
          placeholder="Untitled"
          aria-label="Page title"
          className="mb-4 w-full resize-none overflow-hidden bg-transparent text-4xl font-bold leading-tight tracking-tight outline-none placeholder:text-muted/50"
        />

        {inTable && editor && (
          <div className="sticky top-2 z-10 mb-2 flex w-fit flex-wrap gap-0.5 rounded-md border border-line bg-surface p-0.5 shadow">
            {tableBtn('+ Row', () => editor.chain().focus().addRowAfter().run())}
            {tableBtn('+ Column', () => editor.chain().focus().addColumnAfter().run())}
            {tableBtn('− Row', () => editor.chain().focus().deleteRow().run())}
            {tableBtn('− Column', () => editor.chain().focus().deleteColumn().run())}
            {tableBtn('Delete table', () => editor.chain().focus().deleteTable().run())}
          </div>
        )}

        <EditorContent editor={editor} />
      </div>
      <SlashMenu />
    </div>
  );
}
