# Study Tool

A personal, fully offline study app. Organise **Subjects → (folders) → Chapters**; every chapter has three files:

| Tab | What it is |
| --- | --- |
| **Knowledge Web** | A canvas of points (title, rich text, pasted images), category boxes and typed, coloured arrows |
| **Notes** | A Notion-style page with a `/` block menu, Markdown shortcuts and drag handles |
| **Question Bank** | Questions in 8 sections, added by hand or by CSV, plus a random **worksheet generator** with PDF output |

No backend, no AI, no network. Everything is stored in your browser's IndexedDB and autosaved on every change.
The build is **one self-contained `dist/index.html`** that you can double-click, copy to a USB stick, or keep anywhere.

## Commands

```bash
npm install        # once
npm run dev        # develop at http://localhost:5173
npm run build      # type-check + build the single file dist/index.html
npm run preview    # serve the built file locally
```

To use the app offline: run `npm run build`, then open `dist/index.html` in Chrome, Edge or Firefox.

> Your data lives in the browser profile **for the address you opened the app from**. Keep opening the same file
> from the same place, and use **Backup → Export** regularly (and before moving the file or clearing browser data).

## Project structure

```
index.html                 Vite entry
vite.config.ts             React + vite-plugin-singlefile (everything inlined into one HTML file)
tailwind.config.js         Tailwind theme (system fonts, CSS-variable colour tokens, class-based dark mode)
src/
  main.tsx, App.tsx        App shell
  index.css                Tailwind layers, rich-text styles, print styles
  types.ts                 Data model: Folder, Chapter, Point, Box, Relation, Question
  config/
    relationTypes.ts       ← relation types and their colours (edit this one map)
    sections.ts            ← Question Bank sections and default marks
  db/
    db.ts                  Dexie database: folders, chapters, images (Blobs)
    images.ts              Save/load image Blobs, orphan clean-up
  store/
    appStore.ts            Zustand: folder tree, open chapter, theme
    chapterStore.ts        Zustand: the open chapter + debounced autosave
  components/              Sidebar (file tree), ChapterView (tabs), Modal, ConfirmDialog, Icon, BlobImg
  lib/                     Small helpers (ids, HTML sanitising, downloads)
  features/
    web/                   Knowledge Web: canvas, point/box nodes, arrows, legend, search, undo/redo
    notes/                 Notes: TipTap editor, slash menu, callout + image blocks
    bank/                  Question Bank: sections, form, CSV parsing/validation, templates
    worksheet/             Worksheet generator: random pick, preview, jsPDF export, print
    backup/                Export / import everything as one JSON file
```

## Data model

```
Folder   { id, parentId|null, name, type: "subject"|"folder"|"chapter", order, collapsed? }
Chapter  { id, folderId, web: { points, boxes, relations }, notes: { title, doc }, questionBank }
Point    { id, title, text (HTML), images[] (image ids), boxId|null, x, y }   // x,y are relative to the box when boxId is set
Box      { id, category, x, y, w, h }
Relation { id, from, to, type, label }
Question { id, sectionType, text, options[]?, marks, source: "csv"|"manual" }
```

## How to use

**Sidebar** – *New Subject*, then hover a row for *new chapter / new folder / rename / delete*. Double-click to rename.
Drag rows to reorder them or to drop them into another folder.

**Knowledge Web**
- **+ Point** / **+ Box** add items. Double-click a point to edit its title, text and images. Click a box's label to rename its category.
- Drag a point onto a box to put it in; drag it out to release it. Drag a selected box's edges to resize.
- Hover an item and drag from one of the small dots on its edge to another item to draw an arrow, then choose its label and type.
  Double-click an arrow (or its label) to edit it.
- **Ctrl+V** pastes an image: into the point editor if it is open, onto the single selected point, or as a new point.
- Hover a point for its full text and images. Search jumps to a point and flashes it.
- **Ctrl+Z** undo, **Ctrl+Shift+Z / Ctrl+Y** redo, **Delete** removes the selection (Shift+click or Shift+drag to multi-select).

**Notes** – type `/` for blocks. Shortcuts: `# `, `## `, `### `, `- `, `1. `, `[] `, `> `, ```` ``` ````, `---`, `**bold**`, `*italic*`, `` `code` ``.
Hover a block and drag the ⋮⋮ handle to move it. Paste or drop images straight in.

**Question Bank** – pick a section, then *Add question*, or *Upload CSV*.
CSV columns: `question,option_a,option_b,option_c,option_d,marks` (options are only read for MCQ; a blank `marks`
uses the section's default). Use *Template CSV* for a ready-made file. Bad rows are skipped and listed with row number and reason.

**Worksheet** – *Generate Worksheet*, enter how many questions per section, *Generate*. *Regenerate* picks a new random set.
*Download PDF* builds an A4 PDF in the browser. *Print* uses the browser's print dialog (choose "Save as PDF") — use this
for non-Latin scripts or special symbols, which the PDF's built-in font cannot draw.

**Backup** – *Export* downloads one JSON file with everything (images base64-encoded). *Import* replaces all current data with a backup.

## Changing relation colours

Edit `src/config/relationTypes.ts`. The legend, the arrow editor and the arrows all read from that one map. Rebuild afterwards.

## Manual test checklist

Run `npm run build`, open `dist/index.html`, then **turn the network off** (DevTools → Network → Offline, or disable Wi-Fi).

**Offline & storage**
- [ ] The app loads and works with the network disabled; the DevTools Network tab shows no requests.
- [ ] Reload the page: all subjects, chapters and content are still there, and the last chapter reopens.
- [ ] Dark-mode toggle works on every tab and is remembered after reload.

**Sidebar**
- [ ] Create a subject, a folder inside it and chapters in both; rename by double-click and by the pencil icon.
- [ ] Collapse/expand a subject; the state survives a reload.
- [ ] Drag a chapter above/below a sibling to reorder; drag it onto a folder to move it in.
- [ ] A subject cannot be dropped inside another item; a folder cannot be dropped into itself.
- [ ] Delete asks for confirmation; deleting a subject removes everything inside it.
- [ ] With no subjects / no open chapter, helpful empty states are shown.

**Knowledge Web**
- [ ] Add points and boxes; edit a point's title and rich text; rename a box category.
- [ ] Copy an image and press Ctrl+V in the point editor, on a selected point, and on the empty canvas.
- [ ] Drag a point into a box (it then moves with the box) and back out. Resize a box.
- [ ] Draw an arrow point→point, box→box and point→box; set label and type; the colour matches the legend.
- [ ] Double-click an arrow to change its type/label or delete it.
- [ ] Hovering a point shows its full text and images.
- [ ] Search finds points by title and text; clicking a result pans/zooms to it and it flashes.
- [ ] Minimap, zoom buttons, scroll-zoom and drag-pan work.
- [ ] Undo/redo (buttons and Ctrl+Z / Ctrl+Shift+Z) work for add, move, edit, arrow and delete.
- [ ] Delete key removes selected items after confirmation; deleting a box keeps its points.

**Notes**
- [ ] Title and body save automatically ("Saving…" → "✓ Saved") and survive tab switches and reloads.
- [ ] `/` opens the menu; arrow keys + Enter insert each block: headings, bullet, numbered, to-do, quote, code, divider, image, table, callout.
- [ ] Markdown shortcuts work: `# `, `- `, `[] `, `**bold**`.
- [ ] Hovering a block shows the drag handle; dragging it moves the block.
- [ ] Table buttons add/remove rows and columns. Pasted images appear and persist.

**Question Bank**
- [ ] Each of the 8 section tabs shows its own list and count.
- [ ] Add, edit and delete a question by hand (MCQ shows option fields; other sections do not).
- [ ] Download a template CSV, fill it in, upload it: questions appear with source "csv".
- [ ] Upload a CSV with an empty question, a non-numeric mark and an MCQ with one option: each is reported with its row number and reason, and good rows are still imported.
- [ ] Upload a file with a wrong header: a clear header error is shown and nothing is imported.

**Worksheet**
- [ ] Each section's number input cannot exceed the number of questions available; empty sections are disabled.
- [ ] Generate shows a preview with title, Name and Date lines, marks beside each question, the total marks, and no answers.
- [ ] No question appears twice; Regenerate picks a different random set.
- [ ] Download PDF produces an A4 PDF (while offline); long worksheets flow onto further pages.
- [ ] Print opens the print dialog showing only the worksheet.

**Backup**
- [ ] Export downloads a `.json` file. Delete a subject, then Import the file: everything, including images, returns.
- [ ] Importing a non-backup file shows an error and changes nothing.
