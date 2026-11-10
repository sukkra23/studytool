import { useImageUrl } from '../db/images';

/** <img> for an image stored as a Blob in IndexedDB. */
export function BlobImg({ id, className, alt = '' }: { id: string; className?: string; alt?: string }) {
  const url = useImageUrl(id);
  if (!url) return <div className={`animate-pulse bg-panel ${className ?? ''}`} style={{ minHeight: 24 }} />;
  return <img src={url} alt={alt} className={className} draggable={false} />;
}
