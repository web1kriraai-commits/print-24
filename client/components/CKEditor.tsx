import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Upload, Loader, X } from 'lucide-react';
import { API_BASE_URL_WITH_API } from '../lib/apiConfig';

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
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Initialize editor with proper LTR direction
  useEffect(() => {
    if (editorRef.current) {
      // Set direction and alignment
      editorRef.current.setAttribute('dir', 'ltr');
      editorRef.current.style.direction = 'ltr';
      editorRef.current.style.textAlign = 'left';
      
      // Set initial content if provided
      if (value) {
        editorRef.current.innerHTML = value;
      } else {
        editorRef.current.innerHTML = '';
      }
      
      // Ensure cursor starts at the beginning (left side)
      const range = document.createRange();
      const selection = window.getSelection();
      if (editorRef.current.firstChild) {
        range.setStart(editorRef.current.firstChild, 0);
      } else {
        range.setStart(editorRef.current, 0);
      }
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []); // Only run once on mount

  // Update content when value prop changes (external updates)
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      const wasFocused = document.activeElement === editorRef.current;
      const selection = window.getSelection();
      let cursorPosition = 0;
      
      // Save cursor position if editor was focused
      if (wasFocused && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(editorRef.current);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        cursorPosition = preCaretRange.toString().length;
      }
      
      editorRef.current.innerHTML = value || '';
      
      // Restore cursor position
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
    if (editorRef.current) {
      editorRef.current.focus();
      
      // Save selection before command
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // If no selection, create a range at cursor position
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false); // Collapse to end
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      
      // Execute command
      try {
        const success = document.execCommand(command, false, value);
        if (!success) {
          console.warn(`Command ${command} failed`);
        }
      } catch (error) {
        console.error(`Error executing command ${command}:`, error);
      }
      
      handleInput();
      
      // Ensure direction remains LTR after command
      if (editorRef.current) {
        editorRef.current.setAttribute('dir', 'ltr');
        editorRef.current.style.direction = 'ltr';
      }
    }
  };

  // Custom alignment function that works better with contentEditable
  const setAlignment = (alignment: 'left' | 'center' | 'right') => {
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    const selection = window.getSelection();
    
    if (!selection || selection.rangeCount === 0) {
      // No selection - find or create block elements and align them
      const blocks = editorRef.current.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
      if (blocks.length > 0) {
        blocks.forEach((block) => {
          (block as HTMLElement).style.textAlign = alignment;
        });
      } else {
        // No blocks found - wrap content in paragraph
        const content = editorRef.current.innerHTML;
        if (content.trim()) {
          const p = document.createElement('p');
          p.style.textAlign = alignment;
          p.innerHTML = content;
          editorRef.current.innerHTML = '';
          editorRef.current.appendChild(p);
        } else {
          // Empty editor - create aligned paragraph
          const p = document.createElement('p');
          p.style.textAlign = alignment;
          p.innerHTML = '<br>';
          editorRef.current.appendChild(p);
          // Set cursor in the paragraph
          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      handleInput();
      return;
    }
    
    const range = selection.getRangeAt(0);
    
    // Find the parent block element (p, div, etc.)
    let node: Node | null = range.commonAncestorContainer;
    let blockElement: HTMLElement | null = null;
    
    // Walk up the DOM tree to find a block element
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
    
    // If we found a block element, align it
    if (blockElement) {
      blockElement.style.textAlign = alignment;
      handleInput();
      return;
    }
    
    // No block element found - we need to create one
    try {
      // Check if there's selected text
      const selectedText = range.toString();
      
      if (selectedText.trim()) {
        // There's selected text - wrap it in a paragraph
        const contents = range.extractContents();
        const p = document.createElement('p');
        p.style.textAlign = alignment;
        p.appendChild(contents);
        range.insertNode(p);
        
        // Move cursor after the paragraph
        const newRange = document.createRange();
        newRange.setStartAfter(p);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // No text selected - find the current line/paragraph context
        // Try to use formatBlock to create a paragraph
        const success = document.execCommand('formatBlock', false, '<p>');
        
        if (success) {
          // Find the newly created paragraph
          const newRange = selection.getRangeAt(0);
          let currentNode: Node | null = newRange.commonAncestorContainer;
          while (currentNode && currentNode !== editorRef.current) {
            if (currentNode.nodeType === Node.ELEMENT_NODE) {
              const el = currentNode as HTMLElement;
              if (el.tagName === 'P') {
                el.style.textAlign = alignment;
                handleInput();
                return;
              }
            }
            currentNode = currentNode.parentNode;
          }
        }
        
        // If formatBlock didn't work, manually create a paragraph
        const p = document.createElement('p');
        p.style.textAlign = alignment;
        p.innerHTML = '<br>';
        
        // Insert at cursor position
        range.insertNode(p);
        
        // Set cursor inside the paragraph
        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
      
      handleInput();
    } catch (e) {
      console.error('Error setting alignment:', e);
      // Final fallback: try to align the entire editor
      editorRef.current.style.textAlign = alignment;
      handleInput();
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      // Ensure direction is always LTR
      editorRef.current.setAttribute('dir', 'ltr');
      editorRef.current.style.direction = 'ltr';
      
      // Don't override text-align on the editor itself if paragraphs have their own alignment
      // Only set left if no child elements have alignment
      const hasAlignedChildren = editorRef.current.querySelectorAll('[style*="text-align"]').length > 0;
      if (!hasAlignedChildren) {
        editorRef.current.style.textAlign = 'left';
      }
      
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // Insert plain text at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (editorRef.current) {
      // If no selection, append to end
      const textNode = document.createTextNode(text);
      editorRef.current.appendChild(textNode);
      
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    handleInput();
  };

  const handleFocus = () => {
    if (editorRef.current) {
      // Ensure LTR direction on focus
      editorRef.current.setAttribute('dir', 'ltr');
      editorRef.current.style.direction = 'ltr';
      editorRef.current.style.textAlign = 'left';
      
      // If empty, ensure cursor is at start (left side)
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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAndInsertImage = async () => {
    if (!imageFile) {
      // If no file selected, try to use URL
      if (imageUrl.trim() && editorRef.current) {
        insertImageFromUrl(imageUrl);
      }
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL_WITH_API}/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Insert the uploaded image
      if (data.url && editorRef.current) {
        insertImageFromUrl(data.url);
      }
    } catch (error) {
      console.error('Image upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      setImageFile(null);
      setImagePreview("");
      setImageUrl("");
      setShowImageDialog(false);
    }
  };

  const insertImageFromUrl = (url: string) => {
    if (!url.trim() || !editorRef.current) return;

    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '10px 0';
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }
    
    editorRef.current.focus();
    handleInput();
  };

  const insertImage = () => {
    if (imageFile) {
      uploadAndInsertImage();
    } else if (imageUrl.trim()) {
      insertImageFromUrl(imageUrl);
      setImageUrl("");
      setShowImageDialog(false);
    }
  };

  const insertLink = () => {
    if (linkUrl.trim() && editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
        const range = selection.getRangeAt(0);
        const link = document.createElement('a');
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = linkText.trim() || linkUrl;
        link.style.color = '#92400e';
        link.style.textDecoration = 'underline';
        
        try {
          range.surroundContents(link);
        } catch (e) {
          // If surroundContents fails, insert the link
          range.deleteContents();
          range.insertNode(link);
        }
        
        // Move cursor after link
        const newRange = document.createRange();
        newRange.setStartAfter(link);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        handleInput();
        setLinkUrl("");
        setLinkText("");
        setShowLinkDialog(false);
      } else {
        // Insert link at cursor position even if no selection
        const range = selection?.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange();
        if (selection && selection.rangeCount === 0) {
          range.setStart(editorRef.current, editorRef.current.childNodes.length);
        }
        range.deleteContents();
        const link = document.createElement('a');
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = linkText.trim() || linkUrl;
        link.style.color = '#92400e';
        link.style.textDecoration = 'underline';
        range.insertNode(link);
        range.setStartAfter(link);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        handleInput();
        setLinkUrl("");
        setLinkText("");
        setShowLinkDialog(false);
      }
    }
  };

  // Render editor with toolbar immediately - no loading state
  return (
    <div 
      className={`ckeditor-container border border-cream-300 rounded-lg overflow-hidden ${className}`}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
      onSubmit={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {/* Toolbar */}
      <div 
        className="bg-cream-100 border-b border-cream-300 p-2 flex items-center gap-2 flex-wrap" 
        dir="ltr"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onSubmit={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            execCommand('bold');
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Bold"
        >
          <Bold size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            execCommand('italic');
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Italic"
        >
          <Italic size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            execCommand('underline');
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Underline"
        >
          <Underline size={16} className="text-cream-900" />
        </button>
        <div className="w-px h-6 bg-cream-300 mx-1" />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            // Ensure we have a selection or create one
            if (editorRef.current) {
              editorRef.current.focus();
              const selection = window.getSelection();
              if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                // If no selection, select all or create a paragraph
                const range = document.createRange();
                if (editorRef.current.textContent && editorRef.current.textContent.trim()) {
                  range.selectNodeContents(editorRef.current);
                } else {
                  range.setStart(editorRef.current, 0);
                  range.setEnd(editorRef.current, 0);
                  // Insert a paragraph first
                  const p = document.createElement('p');
                  p.textContent = '\u200B'; // Zero-width space
                  range.insertNode(p);
                  range.selectNodeContents(p);
                }
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            }
            execCommand('insertUnorderedList');
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Bullet List"
        >
          <List size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            // Ensure we have a selection or create one
            if (editorRef.current) {
              editorRef.current.focus();
              const selection = window.getSelection();
              if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
                // If no selection, select all or create a paragraph
                const range = document.createRange();
                if (editorRef.current.textContent && editorRef.current.textContent.trim()) {
                  range.selectNodeContents(editorRef.current);
                } else {
                  range.setStart(editorRef.current, 0);
                  range.setEnd(editorRef.current, 0);
                  // Insert a paragraph first
                  const p = document.createElement('p');
                  p.textContent = '\u200B'; // Zero-width space
                  range.insertNode(p);
                  range.selectNodeContents(p);
                }
                selection?.removeAllRanges();
                selection?.addRange(range);
              }
            }
            execCommand('insertOrderedList');
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Numbered List"
        >
          <List size={16} className="text-cream-900" />
        </button>
        <div className="w-px h-6 bg-cream-300 mx-1" />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            setShowLinkDialog(true);
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Insert Link"
        >
          <LinkIcon size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            setShowImageDialog(true);
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Insert Image"
        >
          <ImageIcon size={16} className="text-cream-900" />
        </button>
        <div className="w-px h-6 bg-cream-300 mx-1" />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            setAlignment('left');
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Align Left"
        >
          <AlignLeft size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            setAlignment('center');
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className="p-2 hover:bg-cream-200 rounded transition-colors"
          title="Align Center"
        >
          <AlignCenter size={16} className="text-cream-900" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
            setAlignment('right');
            return false;
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onMouseUp={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
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
        className="w-full px-4 py-3 min-h-[200px] max-h-[400px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-cream-500"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="ltr">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cream-900">Insert Image</h3>
              <button
                type="button"
                onClick={() => {
                  setShowImageDialog(false);
                  setImageFile(null);
                  setImagePreview("");
                  setImageUrl("");
                  editorRef.current?.focus();
                }}
                className="text-cream-500 hover:text-cream-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Select Image File
                </label>
                <div className="border-2 border-dashed border-cream-300 rounded-lg p-4 text-center hover:border-cream-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileSelect}
                    className="hidden"
                    id="image-upload-input"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-upload-input"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload size={24} className="text-cream-500" />
                    <span className="text-sm text-cream-700">
                      {imageFile ? imageFile.name : 'Click to select image'}
                    </span>
                    <span className="text-xs text-cream-500">JPG, PNG, WebP (Max 10MB)</span>
                  </label>
                </div>
                {imagePreview && (
                  <div className="mt-3 relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-auto max-h-48 object-contain rounded-lg border border-cream-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview("");
                        const input = document.getElementById('image-upload-input') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* OR Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-cream-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-cream-500">OR</span>
                </div>
              </div>

              {/* URL Input Section */}
              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Image URL (Alternative)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-cream-500 focus:border-cream-500"
                  placeholder="https://example.com/image.jpg"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      insertImage();
                    } else if (e.key === 'Escape') {
                      setShowImageDialog(false);
                      setImageUrl("");
                      setImageFile(null);
                      setImagePreview("");
                    }
                  }}
                  disabled={uploadingImage || !!imageFile}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={insertImage}
                  disabled={uploadingImage || (!imageFile && !imageUrl.trim())}
                  className="flex-1 px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingImage ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Insert Image'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImageDialog(false);
                    setImageFile(null);
                    setImagePreview("");
                    setImageUrl("");
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="ltr">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-cream-900 mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cream-900 mb-2">
                  Link URL
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
                  className="flex-1 px-4 py-2 bg-cream-900 text-white rounded-lg hover:bg-cream-800 transition-colors"
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
          margin: 10px 0;
        }
        [contenteditable]:focus {
          outline: none;
        }
        [contenteditable] * {
          direction: ltr !important;
          text-align: left !important;
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
      `}</style>
    </div>
  );
};

export default CKEditor;
