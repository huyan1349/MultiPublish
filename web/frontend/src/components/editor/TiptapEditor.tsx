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
    className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-150 active:translate-y-px ${
      isActive
        ? 'border-[rgba(23,23,20,0.92)] bg-[var(--ink)] text-white'
        : 'border-transparent bg-transparent text-[var(--ink-faint)] hover:border-[rgba(49,56,45,0.14)] hover:bg-[rgba(255,255,255,0.6)] hover:text-[var(--ink)]'
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
    <div className="overflow-hidden rounded-[30px] border border-[rgba(49,56,45,0.12)] bg-[rgba(255,255,255,0.82)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[rgba(49,56,45,0.12)] bg-[rgba(244,249,243,0.82)] px-4 py-3">
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
        <span className="mx-1 h-6 w-px bg-[rgba(49,56,45,0.12)]" />
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="二级标题">
          <Heading2 size={14} strokeWidth={1.5} />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="三级标题">
          <Heading3 size={14} strokeWidth={1.5} />
        </ToolButton>
        <span className="mx-1 h-6 w-px bg-[rgba(49,56,45,0.12)]" />
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
        <span className="hidden font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)] md:inline">
          编辑工具栏
        </span>
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
