import { useEffect, type ReactNode } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Undo,
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  placeholder?: string;
  onChange: (html: string, text: string) => void;
}

type UpdateEditor = {
  getHTML: () => string;
  getText: () => string;
};

interface ToolButtonProps {
  children: ReactNode;
  isActive?: boolean;
  title: string;
  onClick: () => void;
}

function ToolButton({ children, isActive, title, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`tool-btn ${isActive ? 'active' : ''}`}
      title={title}
      onClick={onClick}>
      {children}
    </button>
  );
}

export default function TiptapEditor({ content, placeholder, onChange }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder || '开始输入内容...',
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-content',
      },
    },
    onUpdate: ({ editor: currentEditor }: { editor: UpdateEditor }) => {
      onChange(currentEditor.getHTML(), currentEditor.getText());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if ((content || '') !== editor.getHTML()) {
      editor.commands.setContent(content || '', { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="tiptap-shell">
      <div className="tiptap-toolbar">
        <ToolButton
          title="加粗"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </ToolButton>
        <ToolButton
          title="斜体"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </ToolButton>
        <ToolButton
          title="删除线"
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </ToolButton>
        <ToolButton
          title="行内代码"
          isActive={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={15} />
        </ToolButton>

        <span className="toolbar-divider" />

        <ToolButton
          title="二级标题"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={15} />
        </ToolButton>
        <ToolButton
          title="三级标题"
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={15} />
        </ToolButton>

        <span className="toolbar-divider" />

        <ToolButton
          title="无序列表"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </ToolButton>
        <ToolButton
          title="有序列表"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </ToolButton>
        <ToolButton
          title="引用"
          isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={15} />
        </ToolButton>

        <span className="toolbar-spacer" />

        <ToolButton title="撤销" onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={15} />
        </ToolButton>
        <ToolButton title="重做" onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={15} />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
