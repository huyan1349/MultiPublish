import { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
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

const blobUrlToDataUrl = new Map<string, string>();
export function getResolvedDataUrl(blobUrl: string) { return blobUrlToDataUrl.get(blobUrl); }
export function waitForDataUrls(blobUrls: string[]) { return new Promise<Map<string, string>>((resolve) => { const check = () => { if (blobUrls.every((u) => blobUrlToDataUrl.has(u))) resolve(new Map(blobUrlToDataUrl)); else setTimeout(check, 200); }; check(); }); }

export default function TiptapEditor({ content, placeholder, onChange }: TiptapEditorProps) {
  const editorRef = useRef<Editor | null>(null);

  const handleImageFiles = useCallback((files: FileList | File[]) => {
    const ed = editorRef.current;
    if (!ed) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const blobUrl = URL.createObjectURL(file);
      ed.chain().focus().setImage({ src: blobUrl }).run();
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        blobUrlToDataUrl.set(blobUrl, dataUrl);
        const edNow = editorRef.current;
        if (!edNow) return;
        const { state, view } = edNow;
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === blobUrl) {
            view.dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: dataUrl }));
            return false;
          }
          return true;
        });
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || '开始输入内容…' }),
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: true, inline: true }),
    ],
    content: content || '',
    editorProps: {
      attributes: { class: 'tiptap-content' },
      handleDrop: (_view: any, event: any) => {
        if (event.dataTransfer?.files.length) { handleImageFiles(event.dataTransfer.files); return true; }
        return false;
      },
      handlePaste: (_view: any, event: any) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        let hasImage = false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) { const f = items[i].getAsFile(); if (f) { hasImage = true; handleImageFiles([f]); } }
        }
        return hasImage;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
  });

  useEffect(() => { editorRef.current = editor; }, [editor]);

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
