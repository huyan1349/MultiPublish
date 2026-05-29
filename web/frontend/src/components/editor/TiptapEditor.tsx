import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading2, Heading3, Undo, Redo } from 'lucide-react';

interface TiptapEditorProps {
  content?: string;
  placeholder?: string;
  onChange: (html: string, text: string) => void;
}

const ToolBtn = ({ onClick, isActive, title, children }: {
  onClick: () => void; isActive?: boolean; title: string; children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 transition-colors duration-100 ${
      isActive ? 'bg-dot-red/15 text-dot-red' : 'text-tx-mute hover:text-tx-dim hover:bg-px-hover'
    }`}
  >
    {children}
  </button>
);

export default function TiptapEditor({ content, placeholder, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing…' }),
      Link.configure({ openOnClick: false }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
  });

  if (!editor) return null;

  return (
    <div className="border border-px-border bg-px-card overflow-hidden">
      <div className="flex items-center gap-px px-2 py-1 border-b border-px-border bg-px-surface flex-wrap">
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
          <Bold size={13} strokeWidth={1.5} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
          <Italic size={13} strokeWidth={1.5} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={13} strokeWidth={1.5} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Code">
          <Code size={13} strokeWidth={1.5} />
        </ToolBtn>
        <div className="w-px h-3 bg-px-border mx-0.5" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="H2">
          <Heading2 size={13} strokeWidth={1.5} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="H3">
          <Heading3 size={13} strokeWidth={1.5} />
        </ToolBtn>
        <div className="w-px h-3 bg-px-border mx-0.5" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="List">
          <List size={13} strokeWidth={1.5} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered">
          <ListOrdered size={13} strokeWidth={1.5} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Quote">
          <Quote size={13} strokeWidth={1.5} />
        </ToolBtn>
        <div className="flex-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo size={13} strokeWidth={1.5} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo size={13} strokeWidth={1.5} />
        </ToolBtn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
