import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Upload, Loader, X, Heading1, Heading2, Heading3 } from 'lucide-react';

interface CKEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const CKEditor: React.FC<CKEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter description...",
  className = "",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Initialize editor with proper LTR direction
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setAttribute('dir', 'ltr');
      editorRef.current.style.direction = 'ltr';
      editorRef.current.style.textAlign = 'left';
      
      if (value) {
        editorRef.current.innerHTML = value;
      } else {
        editorRef.current.innerHTML = '';
      }
    }
  }, []); // Only run once on mount

  // Update content when value prop changes (external updates)
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      const wasFocused = document.activeElement === editorRef.current;
      const selection = window.getSelection();
      let cursorPosition = 0;
      
      if (wasFocused && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editorRef.current);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        cursorPosition = preCaretRange.toString().length;
      }
      
      editorRef.current.innerHTML = value || '';
      
      if (wasFocused && cursorPosition > 0) {
        const range = document.createRange();
        let charCount = 0;
        const walker = document.createTreeWalker(
          editorRef.current,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let node;
        while ((node = walker.nextNode())) {
          const nodeLength = node.textContent?.length || 0;
          if (charCount + nodeLength >= cursorPosition) {
            range.setStart(node, cursorPosition - charCount);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            editorRef.current.focus();
            break;
          }
          charCount += nodeLength;
        }
      }
    }
  }, [value]);

  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    
    // Ensure we have a selection
    if (!selection || selection.rangeCount === 0) {
      const range = document.createRange();
      if (editorRef.current.childNodes.length > 0) {
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      } else {
        range.setStart(editorRef.current, 0);
        range.setEnd(editorRef.current, 0);
      }
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    try {
      document.execCommand(command, false, value);
      handleInput();
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
    }
  };

  const setAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      const blocks = editorRef.current.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
      if (blocks.length > 0) {
        blocks.forEach((block) => {
          (block as HTMLElement).style.textAlign = alignment;
        });
      } else {
        const p = document.createElement('p');
        p.style.textAlign = alignment;
        p.innerHTML = '<br>';
        editorRef.current.appendChild(p);
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      handleInput();
      return;
    }
    
    const range = selection.getRangeAt(0);
    let node: Node | null = range.commonAncestorContainer;
    let blockElement: HTMLElement | null = null;
    
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName;
        if (tagName === 'P' || tagName === 'DIV' || 
            tagName === 'H1' || tagName === 'H2' || 
            tagName === 'H3' || tagName === 'H4' ||
            tagName === 'H5' || tagName === 'H6' ||
            tagName === 'LI') {
          blockElement = element;
          break;
        }
      }
      node = node.parentNode;
    }
    
    if (blockElement) {
      blockElement.style.textAlign = alignment;
      handleInput();
    } else {
      try {
        const selectedText = range.toString();
        if (selectedText.trim()) {
          const contents = range.extractContents();
          const p = document.createElement('p');
          p.style.textAlign = alignment;
          p.appendChild(contents);
          range.insertNode(p);
          const newRange = document.createRange();
          newRange.setStartAfter(p);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        } else {
          const p = document.createElement('p');
          p.style.textAlign = alignment;
          p.innerHTML = '<br>';
          range.insertNode(p);
          const newRange = document.createRange();
          newRange.setStart(p, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
        handleInput();
      } catch (e) {
        console.error('Error setting alignment:', e);
      }
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      editorRef.current.setAttribute('dir', 'ltr');
      editorRef.current.style.direction = 'ltr';
      
      const hasAlignedChildren = editorRef.current.querySelectorAll('[style*="text-align"]').length > 0;
      if (!hasAlignedChildren) {
        editorRef.current.style.textAlign = 'left';
      }
      
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    if (html && html.trim()) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      const scripts = tempDiv.querySelectorAll('script, style, iframe, object, embed');
      scripts.forEach(el => el.remove());
      
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      range.insertNode(fragment);
      range.setStartAfter(fragment.lastChild || fragment);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (text) {
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
  };

  const handleFocus = () => {
    if (editorRef.current) {
      editorRef.current.setAttribute('dir', 'ltr');
      editorRef.current.style.direction = 'ltr';
      editorRef.current.style.textAlign = 'left';
      
      if (!editorRef.current.textContent || editorRef.current.textContent.trim() === '') {
        const range = document.createRange();
        range.setStart(editorRef.current, 0);
        range.collapse(true);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAndInsertImage = async () => {
    if (!imageFile) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const token = localStorage.getItem('token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://nonprohibitory-katheryn-unbewitched.ngrok-free.dev";
      const API_BASE_URL_WITH_API = `${API_BASE_URL}/api`;
      
      const uploadResponse = await fetch(`${API_BASE_URL_WITH_API}/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to upload image: ${uploadResponse.status}`);
      }
      
      const uploadData = await uploadResponse.json();

      if (uploadData.url && editorRef.current) {
        insertImageFromUrl(uploadData.url);
      } else {
        throw new Error('No image URL returned from server');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      setImageFile(null);
      setImagePreview("");
      setShowImageDialog(false);
    }
  };

  const insertImageFromUrl = (url: string) => {
    if (!url.trim() || !editorRef.current) return;

    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Uploaded image';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '10px auto';
    img.style.borderRadius = '4px';
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Wrap image in paragraph for better formatting
      const p = document.createElement('p');
      p.style.textAlign = 'center';
      p.appendChild(img);
      range.insertNode(p);
      
      // Add a line break after image
      const br = document.createElement('br');
      p.appendChild(br);
      
      range.setStartAfter(p);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const p = document.createElement('p');
      p.style.textAlign = 'center';
      p.appendChild(img);
      p.appendChild(document.createElement('br'));
      editorRef.current.appendChild(p);
      
      const range = document.createRange();
      range.setStartAfter(p);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    editorRef.current.focus();
    handleInput();
  };

  const insertImage = () => {
    if (imageFile) {
      uploadAndInsertImage();
    }
  };

  const insertLink = () => {
    if (!linkUrl.trim() || !editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;
    
    const link = document.createElement('a');
    link.href = linkUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = linkText.trim() || linkUrl;
    link.style.color = '#92400e';
    link.style.textDecoration = 'underline';
    
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      try {
        range.surroundContents(link);
      } catch (e) {
        range.deleteContents();
        range.insertNode(link);
      }
      
      const newRange = document.createRange();
      newRange.setStartAfter(link);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange();
      if (selection.rangeCount === 0) {
        range.setStart(editorRef.current, editorRef.current.childNodes.length);
      }
      range.deleteContents();
      range.insertNode(link);
      range.setStartAfter(link);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    
    handleInput();
    setLinkUrl("");
    setLinkText("");
    setShowLinkDialog(false);
  };

  const handleToolbarClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
  };

  return (
    <div 
      className={`ckeditor-container border border-cream-300 rounded-lg overflow-hidden ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target !== editorRef.current) {
          e.stopPropagation();
        }
      }}
    >
      {/* Toolbar */}
      <div 
        className="bg-cream-100 border-b border-cream-300 p-2 flex items-center gap-2 flex-wrap" 
        dir="ltr"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'BUTTON' || target.closest('button')) {
            e.stopPropagation();
          }
        }}
      >
        {/* Text Formatting */}
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('bold'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Bold (Ctrl+B)"
        >
          <Bold size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('italic'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Italic (Ctrl+I)"
        >
          <Italic size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('underline'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Underline (Ctrl+U)"
        >
          <Underline size={16} className="text-cream-900" />
        </button>
        
        <div className="w-px h-6 bg-cream-300 mx-1" />
        
        {/* Lists */}
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('insertUnorderedList'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Bullet List"
        >
          <List size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('insertOrderedList'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Numbered List"
        >
          <List size={16} className="text-cream-900" />
        </button>
        
        <div className="w-px h-6 bg-cream-300 mx-1" />
        
        {/* Headings */}
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('formatBlock', false, '<h1>'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Heading 1"
        >
          <Heading1 size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('formatBlock', false, '<h2>'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Heading 2"
        >
          <Heading2 size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('formatBlock', false, '<h3>'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Heading 3"
        >
          <Heading3 size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => execCommand('formatBlock', false, '<p>'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors text-xs font-medium"
          title="Normal Text"
        >
          P
        </button>
        
        <div className="w-px h-6 bg-cream-300 mx-1" />
        
        {/* Links and Images */}
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => setShowLinkDialog(true))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Insert Link"
        >
          <LinkIcon size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => setShowImageDialog(true))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Insert Image"
        >
          <ImageIcon size={16} className="text-cream-900" />
        </button>
        
        <div className="w-px h-6 bg-cream-300 mx-1" />
        
        {/* Alignment */}
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => setAlignment('left'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Align Left"
        >
          <AlignLeft size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => setAlignment('center'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Align Center"
        >
          <AlignCenter size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => handleToolbarClick(e, () => setAlignment('right'))}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Align Right"
        >
          <AlignRight size={16} className="text-cream-900" />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onFocus={handleFocus}
        onPaste={handlePaste}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.stopPropagation();
          }
          // Keyboard shortcuts
          if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
              e.preventDefault();
              execCommand('bold');
            } else if (e.key === 'i') {
              e.preventDefault();
              execCommand('italic');
            } else if (e.key === 'u') {
              e.preventDefault();
              execCommand('underline');
            }
          }
        }}
        className="w-full px-4 py-3 min-h-[200px] max-h-[400px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-cream-500 cursor-text"
        style={{ 
          direction: 'ltr', 
          textAlign: 'left',
          unicodeBidi: 'embed'
        }}
        dir="ltr"
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      {/* Image Dialog */}
      {showImageDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
          dir="ltr"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImageDialog(false);
              setImageFile(null);
              setImagePreview("");
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cream-900">Insert Image</h3>
              <button
                type="button"
                onClick={() => {
                  setShowImageDialog(false);
                  setImageFile(null);
                  setImagePreview("");
                  editorRef.current?.focus();
                }}
                className="text-cream-500 hover:text-cream-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Upload Image File
                </label>
                <div className="border-2 border-dashed border-cream-400 rounded-lg p-6 text-center hover:border-cream-500 transition-colors bg-cream-50">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleImageFileSelect}
                    className="hidden"
                    id="image-upload-input"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-upload-input"
                    className={`cursor-pointer flex flex-col items-center gap-3 ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {imagePreview ? (
                      <>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-auto max-h-48 object-contain rounded-lg border border-cream-200"
                        />
                        <div className="flex items-center gap-2 text-sm text-cream-700">
                          <span>{imageFile?.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setImageFile(null);
                              setImagePreview("");
                              const input = document.getElementById('image-upload-input') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-cream-600" />
                        <div>
                          <span className="text-sm font-medium text-cream-900 block">
                            Click to select image
                          </span>
                          <span className="text-xs text-cream-600 mt-1 block">
                            JPG, PNG, WebP, GIF (Max 10MB)
                          </span>
                        </div>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={insertImage}
                  disabled={uploadingImage || !imageFile}
                  className="flex-1 px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {uploadingImage ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Uploading & Inserting...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload & Insert Image
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImageDialog(false);
                    setImageFile(null);
                    setImagePreview("");
                    editorRef.current?.focus();
                  }}
                  disabled={uploadingImage}
                  className="flex-1 px-4 py-2 border border-cream-300 text-cream-700 rounded-lg hover:bg-cream-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" 
          dir="ltr"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLinkDialog(false);
              setLinkUrl("");
              setLinkText("");
            }
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-cream-900 mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Link URL *
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                  placeholder="https://example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      insertLink();
                    } else if (e.key === 'Escape') {
                      setShowLinkDialog(false);
                      setLinkUrl("");
                      setLinkText("");
                    }
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Link Text (optional)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                  placeholder="Click here"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      insertLink();
                    }
                  }}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={insertLink}
                  disabled={!linkUrl.trim()}
                  className="flex-1 px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkUrl("");
                    setLinkText("");
                    editorRef.current?.focus();
                  }}
                  className="flex-1 px-4 py-2 border border-cream-300 text-cream-700 rounded-lg hover:bg-cream-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #999;
          pointer-events: none;
          direction: ltr;
          text-align: left;
        }
        [contenteditable] {
          outline: none;
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: embed;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 10px auto;
          border-radius: 4px;
        }
        [contenteditable]:focus {
          outline: none;
        }
        [contenteditable] a {
          color: #92400e;
          text-decoration: underline;
        }
        [contenteditable] a:hover {
          color: #7c2d12;
        }
        [contenteditable] ul,
        [contenteditable] ol {
          margin-left: 20px;
          padding-left: 20px;
        }
        [contenteditable] p {
          margin: 8px 0;
        }
        [contenteditable] h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 16px 0 8px 0;
        }
        [contenteditable] h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 14px 0 8px 0;
        }
        [contenteditable] h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 12px 0 8px 0;
        }
      `}</style>
    </div>
  );
};

export default CKEditor;
