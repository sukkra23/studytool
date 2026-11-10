const PATHS: Record<string, string> = {
  chevron: 'M9 6l6 6-6 6',
  subject: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zm0 16a2 2 0 012-2h13',
  folder: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  chapter: 'M7 3h8l4 4v14H7V3zm8 0v4h4M10 12h6M10 16h6',
  plus: 'M12 5v14M5 12h14',
  folderPlus: 'M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm9 3v6m-3-3h6',
  filePlus: 'M7 3h8l4 4v14H7V3zm6 8v6m-3-3h6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  trash: 'M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13',
  sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7l1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2l-1.4-1.4M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 19h14',
  upload: 'M12 19V8m0 0l-4 4m4-4l4 4M5 5h14',
  undo: 'M9 7L4 12l5 5M4 12h10a6 6 0 016 6',
  redo: 'M15 7l5 5-5 5m5-5H10a6 6 0 00-6 6',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zm9 3l-4.3-4.3',
  box: 'M4 6h16v12H4z',
  dot: 'M12 8a4 4 0 100 8 4 4 0 000-8z',
  close: 'M6 6l12 12M18 6L6 18',
  image: 'M4 5h16v14H4V5zm0 11l5-5 4 4 3-3 4 4M9 9.5a1 1 0 11-2 0 1 1 0 012 0z',
  sheet: 'M6 3h9l4 4v14H6V3zm3 9h7M9 16h7M9 8h3',
  print: 'M7 9V4h10v5M7 17H5a1 1 0 01-1-1v-5a2 2 0 012-2h12a2 2 0 012 2v5a1 1 0 01-1 1h-2M7 14h10v6H7v-6z',
  refresh: 'M4 12a8 8 0 0114-5.3L20 9m0-5v5h-5m5 3a8 8 0 01-14 5.3L4 15m0 5v-5h5',
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
