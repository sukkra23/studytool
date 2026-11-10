import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { BlobImg } from '../../components/BlobImg';

/** Highlighted block that wraps other blocks. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '', class: 'callout' }), 0];
  },
});

function BlobImageView({ node, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper className="my-2" data-drag-handle>
      <BlobImg
        id={node.attrs.imageId as string}
        className={`max-w-full rounded-md ${selected ? 'outline outline-2 outline-accent' : ''}`}
      />
    </NodeViewWrapper>
  );
}

/** Image block whose pixels live in IndexedDB (as a Blob); the document only stores the id. */
export const BlobImage = Node.create({
  name: 'blobImage',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { imageId: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'div[data-blob-image]', getAttrs: (el) => ({ imageId: (el as HTMLElement).dataset.blobImage }) }];
  },
  renderHTML({ node }) {
    return ['div', { 'data-blob-image': node.attrs.imageId }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(BlobImageView);
  },
});
