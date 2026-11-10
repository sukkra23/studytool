import { useMemo, useState } from 'react';
import { useChapterStore } from '../../store/chapterStore';
import { useAppStore } from '../../store/appStore';
import { SECTIONS, getSection, type SectionId } from '../../config/sections';
import type { Question } from '../../types';
import { Icon } from '../../components/Icon';
import { confirm } from '../../components/ConfirmDialog';
import { downloadBlob, pickFile } from '../../lib/download';
import { parseQuestionCsv, templateCsv, CSV_COLUMNS, type CsvError } from './csv';
import { QuestionForm } from './QuestionForm';
import { WorksheetDialog } from '../worksheet/WorksheetDialog';

interface ImportReport {
  section: SectionId;
  file: string;
  imported: number;
  errors: CsvError[];
}

export default function QuestionBank() {
  const questions = useChapterStore((s) => s.chapter!.questionBank);
  const folderId = useChapterStore((s) => s.chapter!.folderId);
  const setQuestions = useChapterStore((s) => s.setQuestions);
  const chapterName = useAppStore((s) => s.folders.find((f) => f.id === folderId)?.name ?? 'Chapter');

  const [active, setActive] = useState<SectionId>('mcq');
  const [form, setForm] = useState<{ question?: Question } | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [worksheet, setWorksheet] = useState(false);

  const counts = useMemo(() => {
    const c = Object.fromEntries(SECTIONS.map((s) => [s.id, 0])) as Record<SectionId, number>;
    questions.forEach((q) => (c[q.sectionType] = (c[q.sectionType] ?? 0) + 1));
    return c;
  }, [questions]);

  const section = getSection(active);
  const list = questions.filter((q) => q.sectionType === active);

  const upload = async () => {
    const file = await pickFile('.csv,text/csv');
    if (!file) return;
    const result = parseQuestionCsv(await file.text(), active);
    if (result.questions.length) setQuestions([...useChapterStore.getState().chapter!.questionBank, ...result.questions]);
    setReport({ section: active, file: file.name, imported: result.questions.length, errors: result.errors });
  };

  const saveQuestion = (q: Question) => {
    const current = useChapterStore.getState().chapter!.questionBank;
    setQuestions(current.some((x) => x.id === q.id) ? current.map((x) => (x.id === q.id ? q : x)) : [...current, q]);
    setForm(null);
  };

  const remove = async (q: Question) => {
    const ok = await confirm({
      title: 'Delete question?',
      message: q.text.length > 140 ? `${q.text.slice(0, 140)}…` : q.text,
    });
    if (ok) setQuestions(useChapterStore.getState().chapter!.questionBank.filter((x) => x.id !== q.id));
  };

  const clearSection = async () => {
    const ok = await confirm({
      title: `Delete all ${list.length} questions in ${section.short}?`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete all',
    });
    if (ok) setQuestions(useChapterStore.getState().chapter!.questionBank.filter((x) => x.sectionType !== active));
  };

  return (
    <div className="flex h-full flex-col" data-bank>
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-5">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto py-2" role="tablist" aria-label="Sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={active === s.id}
              onClick={() => {
                setActive(s.id);
                setReport(null);
              }}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                active === s.id ? 'bg-accent text-white dark:text-zinc-900' : 'text-muted hover:bg-panel hover:text-ink'
              }`}
            >
              {s.label}
              <span
                className={`rounded-full px-1.5 text-[10px] ${active === s.id ? 'bg-white/25' : 'bg-line'}`}
                data-count={s.id}
              >
                {counts[s.id]}
              </span>
            </button>
          ))}
        </div>
        <button className="btn-primary shrink-0" onClick={() => setWorksheet(true)}>
          <Icon name="sheet" /> Generate Worksheet
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-5 py-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-base font-semibold">
              {section.label} <span className="font-normal text-muted">· {list.length} question{list.length === 1 ? '' : 's'}</span>
            </h2>
            <button className="btn" onClick={() => setForm({})}>
              <Icon name="plus" /> Add question
            </button>
            <button className="btn" onClick={() => void upload()}>
              <Icon name="upload" /> Upload CSV
            </button>
            <button
              className="btn"
              onClick={() => downloadBlob(new Blob([templateCsv(active)], { type: 'text/csv' }), `template-${active}.csv`)}
              title={`Columns: ${CSV_COLUMNS.join(',')}`}
            >
              <Icon name="download" /> Template CSV
            </button>
            {list.length > 0 && (
              <button className="btn !text-red-500" onClick={() => void clearSection()}>
                <Icon name="trash" /> Clear section
              </button>
            )}
          </div>

          {report && report.section === active && (
            <div
              className={`mb-4 rounded-lg border p-3 text-sm ${
                report.errors.length ? 'border-amber-400/60 bg-amber-400/10' : 'border-emerald-500/50 bg-emerald-500/10'
              }`}
              role="status"
              data-csv-report
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <b>{report.file}</b>: imported {report.imported} question{report.imported === 1 ? '' : 's'}
                  {report.errors.length > 0 && `, skipped ${report.errors.length} row${report.errors.length === 1 ? '' : 's'} with errors`}
                  .
                </div>
                <button className="btn-icon !h-6 !w-6" onClick={() => setReport(null)} aria-label="Dismiss">
                  <Icon name="close" size={14} />
                </button>
              </div>
              {report.errors.length > 0 && (
                <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto font-mono text-xs">
                  {report.errors.map((e, i) => (
                    <li key={i}>
                      <b>{e.row > 0 ? `Row ${e.row}` : 'File'}:</b> {e.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">
              <div className="mb-1 text-base font-medium text-ink">No {section.short} questions yet</div>
              Add one by hand, or upload a CSV with the columns
              <code className="mx-1 rounded bg-panel px-1.5 py-0.5 text-xs">{CSV_COLUMNS.join(',')}</code>
              {section.hasOptions ? '' : '(option columns are ignored in this section)'}.
            </div>
          ) : (
            <ol className="space-y-2">
              {list.map((q, i) => (
                <li key={q.id} className="group flex gap-3 rounded-lg border border-line bg-surface p-3" data-question>
                  <span className="w-6 shrink-0 pt-0.5 text-right text-sm text-muted">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="whitespace-pre-wrap break-words text-sm">{q.text}</div>
                    {q.options && q.options.length > 0 && (
                      <ol className="mt-1.5 grid gap-x-6 gap-y-0.5 text-sm text-muted sm:grid-cols-2">
                        {q.options.map((o, j) => (
                          <li key={j}>
                            <span className="font-medium">({String.fromCharCode(97 + j)})</span> {o}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-panel px-1.5 py-0.5 text-[10px] uppercase text-muted">{q.source}</span>
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-xs font-semibold text-accent">
                        {q.marks} M
                      </span>
                    </div>
                    <div className="flex opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                      <button className="btn-icon" title="Edit" aria-label="Edit question" onClick={() => setForm({ question: q })}>
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        className="btn-icon hover:!text-red-500"
                        title="Delete"
                        aria-label="Delete question"
                        onClick={() => void remove(q)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {form && (
        <QuestionForm
          key={form.question?.id ?? 'new'}
          sectionId={form.question?.sectionType ?? active}
          question={form.question}
          onSave={saveQuestion}
          onClose={() => setForm(null)}
        />
      )}
      {worksheet && <WorksheetDialog questions={questions} chapterName={chapterName} onClose={() => setWorksheet(false)} />}
    </div>
  );
}
