import React, { useEffect, useRef } from "react";
import { BlockNoteSchema, createCodeBlockSpec } from "@blocknote/core";
import { codeBlockOptions } from "@blocknote/code-block";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  rows?: number;
  borderless?: boolean;
}

const editorSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    codeBlock: createCodeBlockSpec(codeBlockOptions),
  },
});

const getMinHeightClass = (rows?: number) => {
  if (!rows)      return "min-h-[200px]";
  if (rows <= 6)  return "min-h-[160px]";
  if (rows <= 10) return "min-h-[280px]";
  if (rows <= 14) return "min-h-[360px]";
  return "min-h-[420px]";
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Start writing...",
  rows,
  borderless,
}) => {
  const isInitialized = useRef(false);
  const lastEmittedHtml = useRef(value);

  const editor = useCreateBlockNote({
    schema: editorSchema,
    placeholders: {
      default: placeholder,
    },
  });

  // Parse initial HTML into blocks on mount
  useEffect(() => {
    if (!editor || isInitialized.current) return;
    isInitialized.current = true;
    if (!value) return;
    const blocks = editor.tryParseHTMLToBlocks(value);
    editor.replaceBlocks(editor.document, blocks);
  }, [editor]);

  // Sync externally-driven value changes (e.g. form reset)
  useEffect(() => {
    if (!editor || !isInitialized.current) return;
    if (value === lastEmittedHtml.current) return;
    const blocks = editor.tryParseHTMLToBlocks(value || "");
    editor.replaceBlocks(editor.document, blocks);
    lastEmittedHtml.current = value;
  }, [editor, value]);

  const handleChange = async () => {
    const html = await editor.blocksToHTMLLossy(editor.document);
    if (html === lastEmittedHtml.current) return;
    lastEmittedHtml.current = html;
    onChange(html);
  };

  const minHeightClass = getMinHeightClass(rows);

  return (
    <div
      className={[
        minHeightClass,
        borderless ? "bg-white" : "border border-gray-300 rounded-lg bg-white shadow-sm overflow-hidden",
      ].join(" ")}
    >
      <BlockNoteView editor={editor} onChange={handleChange} theme="light" />
    </div>
  );
};

export default RichTextEditor;
