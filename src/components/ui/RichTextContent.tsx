"use client";

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";

interface RichTextContentProps {
  /** Trusted-by-our-editor HTML. Sanitized client-side before render. */
  html: string;
  className?: string;
  /** Element tag to wrap the rendered HTML. Defaults to "div". */
  as?: keyof React.JSX.IntrinsicElements;
}

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s", "code", "pre",
  "h1", "h2", "h3",
  "ul", "ol", "li",
  "blockquote", "hr",
  "a", "img", "mark", "span",
];
const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "style", "class"];
const ALLOWED_URI_REGEXP = /^(https?:|mailto:|tel:|\/)/i;

/**
 * Renders HTML emitted by RichTextEditor. Sanitization happens client-side
 * in useEffect so that the SSR'd empty markup is replaced after mount —
 * React 19 retains the server-rendered dangerouslySetInnerHTML on hydration
 * even if a re-computed render value differs, so we explicitly commit the
 * sanitized HTML through state once we're in the browser.
 */
export function RichTextContent({
  html,
  className = "",
  as: Tag = "div",
}: RichTextContentProps) {
  const [safeHtml, setSafeHtml] = useState<string>("");

  useEffect(() => {
    if (!html) {
      setSafeHtml("");
      return;
    }
    setSafeHtml(
      DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOWED_URI_REGEXP,
      })
    );
  }, [html]);

  return (
    <Tag
      className={`tiptap-content ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
