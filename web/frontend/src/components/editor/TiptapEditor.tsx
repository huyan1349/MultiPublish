import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TipTapImage from '@tiptap/extension-image';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Heading2, Heading3, Undo, Redo, ImageIcon } from 'lucide-react';

interface TiptapEditorProps {
  content?: string;
  placeholder?: string;
  onChange: (html: string, text: string) => void;
  onImageInsert?: (files: FileList | File[]) => void;
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

/** 可拖拽缩放的图片扩展：包裹 img 在可 resize 的容器中 */
const ResizableImage = TipTapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: '400', rendered: false },
    };
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'image-resize-wrapper';
      wrapper.style.width = (node.attrs.width || '400') + 'px';
      wrapper.setAttribute('data-image-wrapper', '');

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.title = node.attrs.title || '';
      img.draggable = false;
      wrapper.appendChild(img);

      // 支持拖拽调换位置：ProseMirror 自动处理 draggable 节点
      wrapper.draggable = true;
      wrapper.addEventListener('dragstart', (e) => {
        // 拖拽缩放句柄区域时不触发位置拖拽
        const rect = wrapper.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        if (relX > rect.width - 20 && relY > rect.height - 20) {
          e.preventDefault();
        }
        // 其余区域让 ProseMirror 自带事件处理
        e.dataTransfer!.effectAllowed = 'move';
      });

      // 同步 CSS resize 句柄拖拽后的宽度回 ProseMirror 节点属性
      const onResize = () => {
        const pos = typeof getPos === 'function' ? getPos() : undefined;
        if (pos === undefined || pos === null) return;
        const w = parseInt(wrapper.style.width, 10) || wrapper.offsetWidth;
        if (w > 0) {
          const { state, dispatch } = editor.view;
          const tr = state.tr.setNodeAttribute(pos, 'width', String(w));
          dispatch(tr);
        }
      };
      const resizeObserver = new ResizeObserver(() => onResize());
      resizeObserver.observe(wrapper);

      return {
        dom: wrapper,
        contentDOM: null,
        update(updatedNode) {
          if (updatedNode.type.name !== 'image') return false;
          if (updatedNode.attrs.src !== node.attrs.src) {
            img.src = updatedNode.attrs.src || '';
          }
          img.alt = updatedNode.attrs.alt || '';
          img.title = updatedNode.attrs.title || '';
          return true;
        },
        ignoreMutation(mutation) {
          // 允许 wrapper 自己被外部修改（如 CSS resize）
          return mutation.target === wrapper && (mutation.type === 'attributes' || mutation.type === 'childList');
        },
        destroy() {
          resizeObserver.disconnect();
        },
      };
    };
  },

  // 序列化输出：纯 img，不带 wrapper，兼容现有流程
  renderHTML({ HTMLAttributes }) {
    return ['img', HTMLAttributes];
  },

  // 解析：接受 wrapper + img 或纯 img
  parseHTML() {
    return [
      { tag: 'div.image-resize-wrapper img' },
      { tag: 'img[src]' },
    ];
  },
});

export interface TiptapEditorHandle {
  insertImages: (files: FileList | File[]) => void;
  getEditor: () => Editor | null;
  setContent: (content: string) => void;
}

const TiptapEditorInner = forwardRef<TiptapEditorHandle, TiptapEditorProps>(function TiptapEditorInner({ content, placeholder, onChange, onImageInsert }, ref) {
  const editorRef = useRef<Editor | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleImageFiles = useCallback((files: FileList | File[]) => {
    const ed = editorRef.current;
    if (!ed) {
      console.warn('[TiptapEditor] handleImageFiles: editor not ready');
      return;
    }
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const blobUrl = URL.createObjectURL(file);
      if (!ed.isFocused) {
        ed.commands.focus('end');
      }
      const insertOk = ed.chain().setImage({ src: blobUrl }).run();
      console.log('[TiptapEditor] setImage result:', insertOk, 'src:', blobUrl.slice(0, 60));
      if (!insertOk) {
        const endPos = ed.state.doc.content.size;
        ed.chain().insertContentAt(endPos, { type: 'image', attrs: { src: blobUrl } }).run();
        console.log('[TiptapEditor] fallback insertContentAt at end');
      }
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

  const isExternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Placeholder.configure({ placeholder: placeholder || '开始输入内容…' }),
      Link.configure({ openOnClick: false }),
      ResizableImage.configure({ allowBase64: true, inline: false }),
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
    onUpdate: ({ editor }) => {
      if (!isExternalUpdate.current) {
        onChange(editor.getHTML(), editor.getText());
      }
    },
  });

  useEffect(() => { editorRef.current = editor; }, [editor]);

  useImperativeHandle(ref, () => ({
    insertImages: handleImageFiles,
    getEditor: () => editorRef.current,
    setContent: (c: string) => {
      const ed = editorRef.current;
      if (ed) {
        isExternalUpdate.current = true;
        ed.commands.setContent(c);
        isExternalUpdate.current = false;
      }
    },
  }), [handleImageFiles]);

  useEffect(() => {
    if (!editor || content === undefined) return;
    const currentHtml = editor.getHTML();
    if (content !== currentHtml) {
      isExternalUpdate.current = true;
      editor.commands.setContent(content || '');
      isExternalUpdate.current = false;
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-[30px] border transition-all duration-200 ${
        isDragOver
          ? 'border-[var(--accent)] shadow-[0_0_0_3px_rgba(91,108,240,0.12),0_0_40px_rgba(91,108,240,0.08)]'
          : 'border-[rgba(49,56,45,0.12)]'
      } bg-[rgba(255,255,255,0.82)]`}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        dragCounterRef.current += 1;
        if (e.dataTransfer?.types.includes('Files')) {
          setIsDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current <= 0) {
          dragCounterRef.current = 0;
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        const alreadyHandled = e.defaultPrevented;
        e.preventDefault();
        dragCounterRef.current = 0;
        setIsDragOver(false);
        if (e.dataTransfer?.files.length && !alreadyHandled) {
          handleImageFiles(e.dataTransfer.files);
        }
      }}
    >
      {/* 隐藏文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
            handleImageFiles(files);
          }
          e.target.value = '';
        }}
      />

      {/* 拖拽提示浮层 */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(91,108,240,0.06)] backdrop-blur-[2px] rounded-[30px] pointer-events-none">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--accent)] bg-white/95 px-10 py-8 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <ImageIcon size={32} className="text-[var(--accent)]" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-[var(--accent-deep)]">释放以插入图片</span>
          </div>
        </div>
      )}

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
        <ToolButton
          onClick={() => fileInputRef.current?.click()}
          title="插入图片">
          <ImageIcon size={14} strokeWidth={1.5} />
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
});

export default TiptapEditorInner;
