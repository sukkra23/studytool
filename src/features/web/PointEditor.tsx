import { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Modal } from '../../components/Modal';
import { BlobImg } from '../../components/BlobImg';
import { Icon } from '../../components/Icon';
import { saveImage } from '../../db/images';
import { imagesFromClipboard, pickFile } from '../../lib/download';
import { updatePoint } from './actions';
import { getWeb, useWebStore } from './webStore';

/** Dialog for a point's title, rich text and images (paste with Ctrl+V). */
export function PointEditor({ pointId }: { pointId: string }) {
  const point = getWeb().points.find((p) => p.id === pointId);
  const [title, setTitle] = useState(point?.title ?? '');
  const [images, setImages] = useState<string[]>(point?.images ?? []);
  const editor = useEditor({
    extensions: [StarterKit],
    content: point?.text ?? '',
    editorProps: { attributes: { class: 'prose-lite min-h-[110px] px-3 py-2 text-sm' } },
  });

  const close = () => useWebStore.setState({ editingPointId: null });
  if (!point) return null;

  const addImages = async (files: Blob[]) => {
    const ids = await Promise.all(files.map((f) => saveImage(f)));
    setImages((cur) => [...cur, ...ids]);
  };

  const save = () => {
    const text = editor && !editor.isEmpty ? editor.getHTML() : '';
    useWebStore.getState().commit(updatePoint(getWeb(), pointId, { title: title.trim() || 'Untitled', text, images }));
    close();
  };

  const mark = (name: string, label: string, run: () => void) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        run();
      }}
      className={`rounded px-2 py-0.5 text-xs font-semibold ${
        editor?.isActive(name) ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-panel'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal
      title="Point of information"
      onClose={close}
      footer={
        <>
          <span className="mr-auto text-xs text-muted">Tip: paste a screenshot with Ctrl+V</span>
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div
        onPasteCapture={(e) => {
          const files = imagesFromClipboard(e.clipboardData);
          if (!files.length) return;
          e.preventDefault();
          e.stopPropagation();
          void addImages(files);
        }}
      >
        <label className="label" htmlFor="point-title">
          Title
        </label>
        <input
          id="point-title"
          className="input"
          value={title}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="label mt-4">Text</div>
        <div className="rounded-md border border-line focus-within:border-accent">
          <div className="flex gap-1 border-b border-line px-2 py-1">
            {mark('bold', 'B', () => editor?.chain().focus().toggleBold().run())}
            {mark('italic', 'I', () => editor?.chain().focus().toggleItalic().run())}
            {mark('bulletList', '• List', () => editor?.chain().focus().toggleBulletList().run())}
            {mark('orderedList', '1. List', () => editor?.chain().focus().toggleOrderedList().run())}
            {mark('code', '</>', () => editor?.chain().focus().toggleCode().run())}
          </div>
          <EditorContent editor={editor} data-point-text />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="label !mb-0">Images ({images.length})</div>
          <button
            className="btn !py-1 text-xs"
            onClick={async () => {
              const f = await pickFile('image/*');
              if (f) await addImages([f]);
            }}
          >
            <Icon name="image" size={14} /> Add image
          </button>
        </div>
        {images.length === 0 ? (
          <div className="mt-2 rounded-md border border-dashed border-line py-5 text-center text-xs text-muted">
            No images. Copy an image and press Ctrl+V here.
          </div>
        ) : (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {images.map((id) => (
              <div key={id} className="group relative">
                <BlobImg id={id} className="h-24 w-full rounded border border-line object-cover" />
                <button
                  className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white group-hover:flex"
                  onClick={() => setImages((cur) => cur.filter((i) => i !== id))}
                  aria-label="Remove image"
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
