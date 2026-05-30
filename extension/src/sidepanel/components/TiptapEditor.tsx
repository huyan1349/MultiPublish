import { useEffect, useCallback, useRef, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
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

/** 将 File 读成 data URL（异步，仅发布时用） */
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** 全局 blob URL → data URL 映射（拖入图片后异步转换，预览/发布直接取） */
const blobUrlToDataUrl = new Map<string, string>();

/** 获取已转换完成的 data URL（可能为空，表示还在转换中） */
export function getResolvedDataUrl(blobUrl: string): string | undefined {
  return blobUrlToDataUrl.get(blobUrl);
}

/** 等待所有 blob → data URL 转换完成 */
export function waitForDataUrls(blobUrls: string[]): Promise<Map<string, string>> {
  return new Promise((resolve) => {
    const check = () => {
      const allDone = blobUrls.every((url) => blobUrlToDataUrl.has(url));
      if (allDone) resolve(new Map(blobUrlToDataUrl));
      else setTimeout(check, 200);
    };
    check();
  });
}

export default function TiptapEditor({ content, placeholder, onChange }: TiptapEditorProps) {
  const editorRef = useRef<Editor | null>(null);

  // 拖拽/粘贴图片：
  // 1. 同步创建 blob URL → 立刻显示
  // 2. 后台异步 FileReader → data URL → 存入 blobUrlToDataUrl
  // 3. 转换完成后，把编辑器里的 src 从 blob 替换为 data URL
  const handleImageFiles = useCallback((files: FileList | File[]) => {
    const ed = editorRef.current;
    if (!ed) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const blobUrl = URL.createObjectURL(file);
      ed.chain().focus().setImage({ src: blobUrl }).run();

      // 后台异步：blob → data URL，通过 ProseMirror 事务更新节点
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        blobUrlToDataUrl.set(blobUrl, dataUrl);
        // 必须走 ProseMirror 事务更新节点，直接改 DOM 无效（getHTML 会返回旧值）
        const edNow = editorRef.current;
        if (!edNow) return;
        const { state, view } = edNow;
        state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === blobUrl) {
            view.dispatch(
              state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: dataUrl }),
            );
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
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder || '开始输入内容...',
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        allowBase64: true,
        inline: true,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-content',
      },
      // 拖入图片 → data URL
      handleDrop: (_view, event, _slice, _moved) => {
        if (event.dataTransfer?.files.length) {
          handleImageFiles(event.dataTransfer.files);
          return true; // 阻止默认行为
        }
        return false;
      },
      // 粘贴图片 → data URL
      handlePaste: (_view, event, _slice) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        let hasImage = false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
              hasImage = true;
              handleImageFiles([file]);
            }
          }
        }
        return hasImage; // 有图片时阻止默认粘贴
      },
    },
    onUpdate: ({ editor: currentEditor }: { editor: UpdateEditor }) => {
      onChange(currentEditor.getHTML(), currentEditor.getText());
    },
  });

  // 保持 ref 与 editor 同步，确保 handleDrop/handlePaste 能拿到最新实例
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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
