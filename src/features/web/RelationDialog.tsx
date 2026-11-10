import { useState } from 'react';
import { Modal } from '../../components/Modal';
import { RELATION_COLORS, RELATION_TYPES, type RelationType } from '../../config/relationTypes';
import { deleteItems, upsertRelation } from './actions';
import { getWeb, useWebStore } from './webStore';
import { confirm } from '../../components/ConfirmDialog';

/** Create / edit an arrow: pick the relation type (colour) and write the label. */
export function RelationDialog() {
  const draft = useWebStore((s) => s.relationDraft)!;
  const [type, setType] = useState<RelationType>(draft.type);
  const [label, setLabel] = useState(draft.label);
  const close = () => useWebStore.setState({ relationDraft: null });

  const save = () => {
    const { isNew: _isNew, ...rel } = draft;
    useWebStore.getState().commit(upsertRelation(getWeb(), { ...rel, type, label: label.trim() }));
    close();
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete arrow?', message: 'You can bring it back with Undo.' }))) return;
    useWebStore.getState().commit(deleteItems(getWeb(), [], [draft.id]));
    close();
  };

  return (
    <Modal
      title={draft.isNew ? 'New arrow' : 'Edit arrow'}
      onClose={close}
      footer={
        <>
          {!draft.isNew && (
            <button className="btn mr-auto !text-red-500" onClick={() => void remove()}>
              Delete
            </button>
          )}
          <button className="btn" onClick={close}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <label className="label" htmlFor="rel-label">
        Label — how are these related?
      </label>
      <input
        id="rel-label"
        className="input"
        value={label}
        autoFocus
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        placeholder="e.g. leads to, is a part of, proves…"
      />
      <div className="label mt-4">Type</div>
      <div className="grid grid-cols-3 gap-1.5">
        {RELATION_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            aria-pressed={type === t}
            className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs capitalize ${
              type === t ? 'border-accent bg-accent/10 font-semibold' : 'border-line hover:bg-panel'
            }`}
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: RELATION_COLORS[t] }} />
            {t}
          </button>
        ))}
      </div>
    </Modal>
  );
}
