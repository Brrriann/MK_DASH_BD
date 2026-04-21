"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextB, ListBullets, ListNumbers, Code } from "@phosphor-icons/react";

interface MeetingNoteEditorProps {
  initialContent?: string;
  onUpdate?: (html: string) => void;
  editable?: boolean;
}

export function MeetingNoteEditor({
  initialContent,
  onUpdate,
  editable = true,
}: MeetingNoteEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "미팅 내용을 입력하세요..." }),
    ],
    content: initialContent ?? "",
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
  });

  if (!editor) return null;

  const toolbarBtn = (active: boolean) =>
    `p-1.5 rounded text-sm transition-colors ${
      active
        ? "bg-blue-100 text-blue-600"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    }`;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {editable && (
        <div className="flex gap-1 p-2 border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={toolbarBtn(editor.isActive("bold"))}
            title="굵게"
          >
            <TextB size={16} weight="regular" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={toolbarBtn(editor.isActive("bulletList"))}
            title="글머리 기호"
          >
            <ListBullets size={16} weight="regular" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={toolbarBtn(editor.isActive("orderedList"))}
            title="번호 목록"
          >
            <ListNumbers size={16} weight="regular" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={toolbarBtn(editor.isActive("codeBlock"))}
            title="코드 블록"
          >
            <Code size={16} weight="regular" />
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="min-h-[240px] p-4 text-sm text-slate-800 font-outfit [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_code]:bg-slate-100 [&_.ProseMirror_code]:rounded [&_.ProseMirror_code]:px-1 [&_.ProseMirror_pre]:bg-slate-100 [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:p-3"
      />
    </div>
  );
}
