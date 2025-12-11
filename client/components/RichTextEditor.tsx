import React, { useRef, useMemo } from 'react';
import { Editor } from 'primereact/editor';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  height?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter description...",
  className = "",
  style,
  height = '300px',
}) => {
  const editorRef = useRef<Editor>(null);

  // Configure Quill modules for rich functionality - memoized for performance
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }], // Font style/family
      [{ 'size': ['small', false, 'large', 'huge'] }], // Font size
      ['bold', 'italic', 'underline', 'strike'], // Text formatting
      [{ 'color': [] }, { 'background': [] }], // Text colors
      [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Lists
      [{ 'indent': '-1'}, { 'indent': '+1' }], // Indentation
      [{ 'align': [] }], // Text alignment
      ['image'], // Image only (no link, video)
      ['clean'] // Remove formatting
    ],
    clipboard: {
      matchVisual: false
    }
  }), []);

  const formats = useMemo(() => [
    'header', 'font', 'size', // Headers, font style, font size
    'bold', 'italic', 'underline', 'strike', // Text formatting
    'color', 'background', // Colors
    'list', 'bullet', 'indent', // Lists and indentation
    'align', // Alignment
    'image' // Image only
  ], []);

  const handleTextChange = (e: any) => {
    if (e.htmlValue !== undefined) {
      onChange(e.htmlValue || '');
    } else if (e.textValue !== undefined) {
      // Fallback to text value if htmlValue is not available
      onChange(e.textValue || '');
    }
  };

  const editorStyle = useMemo(() => ({
    height,
    ...style
  }), [height, style]);

  return (
    <div className={`rich-text-editor-wrapper ${className}`}>
      <Editor
        ref={editorRef}
        value={value || ''}
        onTextChange={handleTextChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={editorStyle}
      />
      <style>{`
        .rich-text-editor-wrapper {
          width: 100%;
        }
        .rich-text-editor-wrapper .p-editor-container {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .rich-text-editor-wrapper .p-editor-toolbar {
          border-bottom: 1px solid #d1d5db;
          background: #f9fafb;
          padding: 0.5rem;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 200px;
        }
        .rich-text-editor-wrapper .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
