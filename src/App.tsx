import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChapterView } from './components/ChapterView';
import { ConfirmDialog } from './components/ConfirmDialog';
import { useAppStore } from './store/appStore';
import { sweepOrphanImages } from './db/images';

export default function App() {
  const ready = useAppStore((s) => s.ready);

  useEffect(() => {
    void useAppStore
      .getState()
      .init()
      .then(() => sweepOrphanImages());
  }, []);

  if (!ready) return <div className="empty">Loading…</div>;

  return (
    <div className="flex h-full">
      <div className="h-full">
        <Sidebar />
      </div>
      <main className="h-full min-w-0 flex-1">
        <ChapterView />
      </main>
      <ConfirmDialog />
    </div>
  );
}
