import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { AudioPlayer } from '../components/AudioPlayer';

const AudioComponent = ({ node }: any) => {
  return (
    <NodeViewWrapper>
      <AudioPlayer src={node.attrs.src} />
    </NodeViewWrapper>
  );
};

export const AudioExtension = Node.create({
  name: 'audio',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'audio',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['audio', mergeAttributes(HTMLAttributes, { controls: true })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioComponent);
  },
});
