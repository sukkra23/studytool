import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { getSection, type SectionId } from '../../config/sections';
import type { Question } from '../../types';
import { uid } from '../../lib/id';

interface Props {
  sectionId: SectionId;
  /** Present when editing. */
  question?: Question;
  onSave: (q: Question) => void;
  onClose: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D'];

export function QuestionForm({ sectionId, question, onSave, onClose }: Props) {
  const section = getSection(sectionId);
  const [text, setText] = useState(question?.text ?? '');
  const [marks, setMarks] = useState(String(question?.marks ?? section.defaultMarks));
  const [options, setOptions] = useState<string[]>(() => LETTERS.map((_, i) => question?.options?.[i] ?? ''));
  const [error, setError] = useState('');

  const submit = () => {
    const m = Number(marks);
    const opts = options.map((o) => o.trim());
    const lastFilled = opts.reduce((last, v, i) => (v ? i : last), -1);
    if (!text.trim()) return setError('Write the question first.');
    if (!Number.isFinite(m) || m <= 0) return setError('Marks must be a positive number.');
    if (section.hasOptions) {
      if (lastFilled < 1) return setError('An MCQ needs at least options A and B.');
      if (opts.slice(0, lastFilled).some((o) => !o)) return setError('Fill the options in order, without gaps.');
    }
    onSave({
      id: question?.id ?? uid(),
      sectionType: sectionId,
      text: text.trim(),
      options: section.hasOptions ? opts.slice(0, lastFilled + 1) : undefined,
      marks: m,
      source: question?.source ?? 'manual',
    });
  };

  return (
    <Modal
      title={`${question ? 'Edit' : 'Add'} question — ${section.short}`}
      onClose={onClose}
      footer={
        <>
          {error && <span className="mr-auto text-xs text-red-500">{error}</span>}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit}>
            {question ? 'Save' : 'Add question'}
          </button>
        </>
      }
    >
      <label className="label" htmlFor="q-text">
        Question
      </label>
      <textarea
        id="q-text"
        className="input min-h-[110px] resize-y"
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        placeholder="Type the question…"
      />

      {section.hasOptions && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {LETTERS.map((l, i) => (
            <div key={l}>
              <label className="label" htmlFor={`q-opt-${i}`}>
                Option {l}
              </label>
              <input
                id={`q-opt-${i}`}
                className="input"
                value={options[i]}
                onChange={(e) => setOptions((cur) => cur.map((o, j) => (j === i ? e.target.value : o)))}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 w-28">
        <label className="label" htmlFor="q-marks">
          Marks
        </label>
        <input
          id="q-marks"
          className="input"
          type="number"
          min={0.5}
          step={0.5}
          value={marks}
          onChange={(e) => setMarks(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
    </Modal>
  );
}
