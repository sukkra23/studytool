import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Question } from '../../types';
import { SECTIONS, type SectionId } from '../../config/sections';
import { Icon } from '../../components/Icon';
import { pickQuestions, sectionMarks, totalMarks, type Counts, type WorksheetGroup } from './generate';
import { buildWorksheetPdf, hasUnsupportedChars } from './pdf';

interface Props {
  questions: Question[];
  chapterName: string;
  onClose: () => void;
}

export function WorksheetDialog({ questions, chapterName, onClose }: Props) {
  const available = useMemo(() => {
    const c = Object.fromEntries(SECTIONS.map((s) => [s.id, 0])) as Counts;
    questions.forEach((q) => (c[q.sectionType] += 1));
    return c;
  }, [questions]);

  const [title, setTitle] = useState(`${chapterName} — Worksheet`);
  const [counts, setCounts] = useState<Counts>(() => Object.fromEntries(SECTIONS.map((s) => [s.id, 0])) as Counts);
  const [groups, setGroups] = useState<WorksheetGroup[] | null>(null);

  const requested = SECTIONS.reduce((sum, s) => sum + Math.min(counts[s.id], available[s.id]), 0);
  const generate = () => setGroups(pickQuestions(questions, counts));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setCount = (id: SectionId, raw: string) => {
    const n = Math.max(0, Math.min(Math.floor(Number(raw) || 0), available[id]));
    setCounts((c) => ({ ...c, [id]: n }));
  };

  const filename = `${(title || 'worksheet').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'worksheet'}.pdf`;
  const downloadPdf = () => groups && buildWorksheetPdf(title, groups).save(filename);

  const print = () => {
    document.body.classList.add('printing-sheet');
    const done = () => {
      document.body.classList.remove('printing-sheet');
      window.removeEventListener('afterprint', done);
    };
    window.addEventListener('afterprint', done);
    window.print();
  };

  const nonLatin = !!groups && hasUnsupportedChars(title + groups.flatMap((g) => g.questions.flatMap((q) => [q.text, ...(q.options ?? [])])).join(''));
  let n = 0;

  return createPortal(
    <div data-modal data-worksheet className="print-ancestor fixed inset-0 z-[900] flex flex-col bg-canvas">
      <div className="print-hide flex shrink-0 items-center gap-3 border-b border-line bg-surface px-5 py-3">
        <h2 className="mr-auto text-base font-semibold">Worksheet Generator</h2>
        <button className="btn" onClick={generate} disabled={!groups || requested === 0} title="Pick a new random set">
          <Icon name="refresh" /> Regenerate
        </button>
        <button className="btn" onClick={print} disabled={!groups?.length} title="Print, or choose “Save as PDF” in the print dialog">
          <Icon name="print" /> Print
        </button>
        <button className="btn-primary" onClick={downloadPdf} disabled={!groups?.length}>
          <Icon name="download" /> Download PDF
        </button>
        <button className="btn-icon" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </div>

      <div className="print-ancestor flex min-h-0 flex-1">
        <aside className="print-hide w-80 shrink-0 overflow-y-auto border-r border-line bg-surface p-5">
          <label className="label" htmlFor="ws-title">
            Worksheet title
          </label>
          <input id="ws-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="label mt-5">Questions per section</div>
          <div className="space-y-2">
            {SECTIONS.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 ${available[s.id] === 0 ? 'opacity-45' : ''}`}>
                <label htmlFor={`ws-${s.id}`} className="min-w-0 flex-1 truncate text-sm" title={s.label}>
                  {s.label}
                </label>
                <input
                  id={`ws-${s.id}`}
                  type="number"
                  min={0}
                  max={available[s.id]}
                  value={counts[s.id]}
                  disabled={available[s.id] === 0}
                  onChange={(e) => setCount(s.id, e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  className="input !w-16 !px-2 text-center"
                />
                <span className="w-10 shrink-0 text-xs text-muted">/ {available[s.id]}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2 text-xs">
            <button className="text-accent hover:underline" onClick={() => setCounts({ ...available })}>
              Use all
            </button>
            <button
              className="text-accent hover:underline"
              onClick={() => setCounts(Object.fromEntries(SECTIONS.map((s) => [s.id, 0])) as Counts)}
            >
              Reset
            </button>
          </div>

          <button className="btn-primary mt-5 w-full" onClick={generate} disabled={requested === 0}>
            <Icon name="sheet" /> {groups ? 'Regenerate' : 'Generate'} ({requested} question{requested === 1 ? '' : 's'})
          </button>

          {questions.length === 0 && (
            <p className="mt-4 text-xs text-muted">This chapter's Question Bank is empty. Add questions first.</p>
          )}
          {nonLatin && (
            <p className="mt-4 rounded-md border border-amber-400/60 bg-amber-400/10 p-2 text-xs">
              Some text uses characters the built-in PDF font cannot draw (non-Latin scripts or special symbols). Use{' '}
              <b>Print → Save as PDF</b> for a correct copy.
            </p>
          )}
        </aside>

        <div className="print-ancestor min-w-0 flex-1 overflow-auto p-6">
          {!groups ? (
            <div className="empty print-hide">
              <div className="text-base font-medium text-ink">Nothing generated yet</div>
              Choose how many questions you want from each section, then press Generate.
            </div>
          ) : groups.length === 0 ? (
            <div className="empty print-hide">No questions selected.</div>
          ) : (
            <div className="sheet mx-auto shadow-xl" data-sheet>
              <h1 className="text-center text-2xl font-bold">{title || 'Worksheet'}</h1>
              <div className="mt-6 flex justify-between text-sm">
                <span>Name: ______________________________</span>
                <span>Date: ____________________</span>
              </div>
              <div className="mt-3 border-b border-black pb-2 text-right text-sm font-bold" data-total>
                Total Marks: {totalMarks(groups)}
              </div>

              {groups.map((g) => (
                <section key={g.sectionId} className="mt-6">
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="text-base font-bold">
                      Section {g.letter}: {g.label}
                    </h2>
                    <span className="text-xs italic">
                      {g.questions.length} question{g.questions.length === 1 ? '' : 's'} · {sectionMarks(g)} marks
                    </span>
                  </div>
                  {g.questions.map((q) => {
                    n += 1;
                    return (
                      <div key={q.id} className="q mb-3 flex gap-2 text-[15px] leading-snug">
                        <span className="w-7 shrink-0">{n}.</span>
                        <div className="min-w-0 flex-1">
                          <div className="whitespace-pre-wrap break-words">{q.text}</div>
                          {q.options && q.options.length > 0 && (
                            <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5">
                              {q.options.map((o, i) => (
                                <div key={i}>
                                  ({String.fromCharCode(97 + i)}) {o}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="w-9 shrink-0 text-right font-bold">[{q.marks}]</span>
                      </div>
                    );
                  })}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
