"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { FontSize } from "./extensions/FontSize";
import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  ImagePlus,
  Undo,
  Redo,
  Palette,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Minus,
  RemoveFormatting,
  Type,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createBrowserSupabase } from "@/lib/supabase/browser";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  /** Supabase storage bucket name to upload images to. Defaults to "question-images". */
  imageBucket?: string;
  /** Min/max heights for the scrollable content area */
  minHeight?: string;
  maxHeight?: string;
}

const COLORS = [
  "#000000", "#374151", "#6B7280", "#9CA3AF",
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
];

const HIGHLIGHT_COLORS = [
  "#FEF08A", "#FDE68A", "#D9F99D", "#A7F3D0",
  "#99F6E4", "#A5F3FC", "#BFDBFE", "#DDD6FE",
  "#FBCFE8", "#FECACA", "#FED7AA", "#FFFFFF",
];

const FONT_SIZES = [
  { label: "Small", value: "14px" },
  { label: "Normal", value: "16px" },
  { label: "Medium", value: "18px" },
  { label: "Large", value: "20px" },
  { label: "Extra Large", value: "24px" },
  { label: "Huge", value: "32px" },
];

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write something...",
  imageBucket = "question-images",
  minHeight = "140px",
  maxHeight = "50vh",
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full h-auto rounded-sm" },
      }),
      Placeholder.configure({ placeholder }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-brand-blue underline cursor-pointer" },
      }),
      Underline,
      FontSize,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "tiptap focus:outline-none px-4 py-3 prose prose-sm sm:prose-base max-w-none",
      },
      handleDrop: (_view, event, _slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files);
          const images = files.filter((f) => f.type.startsWith("image/"));
          if (images.length > 0) {
            event.preventDefault();
            images.forEach((img) => uploadImage(img));
            return true;
          }
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file) uploadImage(file);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  const uploadImage = useCallback(
    async (file: File) => {
      if (!editor) return;
      const fileExt = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;

      const tId = toast.loading("Uploading image...");
      try {
        const supabase = createBrowserSupabase();
        const { data, error } = await supabase.storage
          .from(imageBucket)
          .upload(fileName, file);
        if (error) {
          toast.error("Upload failed", { id: tId, description: error.message });
          return;
        }
        const { data: urlData } = supabase.storage
          .from(imageBucket)
          .getPublicUrl(data.path);
        if (urlData?.publicUrl) {
          editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
          toast.success("Image inserted", { id: tId });
        } else {
          toast.error("Upload succeeded but no public URL returned", { id: tId });
        }
      } catch (err: any) {
        toast.error("Upload failed", { id: tId, description: err?.message });
      }
    },
    [editor, imageBucket]
  );

  const handleImageButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadImage(file);
    event.target.value = "";
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const setColor = (color: string) => {
    editor?.chain().focus().setColor(color).run();
    setColorOpen(false);
  };

  const setHighlight = (color: string) => {
    if (color === "#FFFFFF") {
      editor?.chain().focus().unsetHighlight().run();
    } else {
      editor?.chain().focus().setHighlight({ color }).run();
    }
    setHighlightOpen(false);
  };

  // Keep editor in sync when parent updates content externally (e.g. existing form load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-gray-200 bg-gray-50">
        {/* Font Size */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="gap-1 h-8" title="Font Size">
              <Type className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Size</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {FONT_SIZES.map((size) => (
              <DropdownMenuItem
                key={size.value}
                onClick={() => editor.chain().focus().setFontSize(size.value).run()}
                className="justify-between"
              >
                {size.label}
                <span className="text-xs text-gray-400 ml-3">{size.value}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem onClick={() => editor.chain().focus().unsetFontSize().run()}>
              Reset
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Text Color */}
        <Popover open={colorOpen} onOpenChange={setColorOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" title="Text Color">
              <Palette className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-4 gap-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  title={c}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Highlight */}
        <Popover open={highlightOpen} onOpenChange={setHighlightOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" title="Highlight">
              <Highlighter className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-4 gap-1">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c }}
                  onClick={() => setHighlight(c)}
                  title={c === "#FFFFFF" ? "Remove highlight" : c}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 px-2 ${editor.isActive("bold") ? "bg-gray-200" : ""}`} title="Bold">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 px-2 ${editor.isActive("italic") ? "bg-gray-200" : ""}`} title="Italic">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-8 px-2 ${editor.isActive("underline") ? "bg-gray-200" : ""}`} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`h-8 px-2 ${editor.isActive("heading", { level: 1 }) ? "bg-gray-200" : ""}`} title="Heading 1">
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`h-8 px-2 ${editor.isActive("heading", { level: 2 }) ? "bg-gray-200" : ""}`} title="Heading 2">
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`h-8 px-2 ${editor.isActive("heading", { level: 3 }) ? "bg-gray-200" : ""}`} title="Heading 3">
          <Heading3 className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 px-2 ${editor.isActive("bulletList") ? "bg-gray-200" : ""}`} title="Bullet List">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 px-2 ${editor.isActive("orderedList") ? "bg-gray-200" : ""}`} title="Ordered List">
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`h-8 px-2 ${editor.isActive("blockquote") ? "bg-gray-200" : ""}`} title="Blockquote">
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="h-8 px-2" title="Horizontal Rule">
          <Minus className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`h-8 px-2 ${editor.isActive({ textAlign: "left" }) ? "bg-gray-200" : ""}`} title="Align Left">
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`h-8 px-2 ${editor.isActive({ textAlign: "center" }) ? "bg-gray-200" : ""}`} title="Align Center">
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`h-8 px-2 ${editor.isActive({ textAlign: "right" }) ? "bg-gray-200" : ""}`} title="Align Right">
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={`h-8 px-2 ${editor.isActive({ textAlign: "justify" }) ? "bg-gray-200" : ""}`} title="Justify">
          <AlignJustify className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-gray-200 mx-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={setLink}
          className={`h-8 px-2 ${editor.isActive("link") ? "bg-gray-200" : ""}`} title="Add Link">
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={handleImageButtonClick}
          className="h-8 px-2" title="Insert image">
          <ImagePlus className="h-4 w-4" />
        </Button>

        <div className="flex-1" />

        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          className="h-8 px-2" title="Clear Formatting">
          <RemoveFormatting className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()} className="h-8 px-2" title="Undo">
          <Undo className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()} className="h-8 px-2" title="Redo">
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ minHeight, maxHeight }}>
        <EditorContent editor={editor} />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
}
