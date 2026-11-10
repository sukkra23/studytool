import { create } from 'zustand';
import { Modal } from './Modal';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmState {
  current: (ConfirmOptions & { resolve: (ok: boolean) => void }) | null;
}

const useConfirmStore = create<ConfirmState>(() => ({ current: null }));

/** Promise-based replacement for window.confirm. Render <ConfirmDialog /> once at the app root. */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.setState({ current: { ...options, resolve } }));
}

export function ConfirmDialog() {
  const current = useConfirmStore((s) => s.current);
  if (!current) return null;
  const done = (ok: boolean) => {
    current.resolve(ok);
    useConfirmStore.setState({ current: null });
  };
  return (
    <Modal
      title={current.title}
      onClose={() => done(false)}
      width="max-w-sm"
      footer={
        <>
          <button className="btn" onClick={() => done(false)}>
            Cancel
          </button>
          <button
            className={current.danger === false ? 'btn-primary' : 'btn-danger'}
            onClick={() => done(true)}
            autoFocus
          >
            {current.confirmLabel ?? 'Delete'}
          </button>
        </>
      }
    >
      <p className="whitespace-pre-line text-sm text-muted">{current.message}</p>
    </Modal>
  );
}
