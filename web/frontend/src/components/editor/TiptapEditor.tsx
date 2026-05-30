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

const ToolButton = ({ onClick, isActive, title, children }: {
  onClick: () => void; isActive?: boolean; title: string; children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`p-1.5 transition-[background-color,color,transform] duration-100 active:scale-90 ${
      isActive
        ? 'bg-tx text-white'
        : 'text-tx-dim hover:bg-px-surface hover:text-tx'
    }`}
  >
    {children}
  </button>
);

export default function TiptapEditor({ content, placeholder, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || '开始输入内容…' }),
      Link.configure({ openOnClick: false }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
  });

  if (!editor) return null;

  return (
    <div className="border border-px-border bg-white overflow-hidden">
      <div className="flex items-center gap-px px-2 py-1 border-b border-px-border bg-px-bg/60 flex-wrap">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="加粗">
          <Bold size={14} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="斜体">
          <Italic size={14} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="删除线">
          <Strikethrough size={14} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="行内代码">
          <Code size={14} strokeWidth={1.5} />
        </ToolButton>
        <span className="w-px h-3.5 bg-px-border mx-0.5" />
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="二级标题">
          <Heading2 size={14} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="三级标题">
          <Heading3 size={14} strokeWidth={1.5} />
        </ToolButton>
        <span className="w-px h-3.5 bg-px-border mx-0.5" />
        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="无序列表">
          <List size={14} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="有序列表">
          <ListOrdered size={14} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="引用">
          <Quote size={14} strokeWidth={1.5} />
        </ToolButton>
        <span className="flex-1" />
        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="撤销">
          <Undo size={14} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="重做">
          <Redo size={14} strokeWidth={1.5} />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
