import React, { useEffect, useRef, useCallback, useImperativeHandle } from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
  autoResize?: boolean;
  maxHeight?: number | string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helper,
      error,
      className = "",
      id,
      autoResize = false,
      maxHeight = 220,
      onChange,
      style,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const inputId =
      id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const adjustHeight = useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoResize) return;

      const maxH =
        typeof maxHeight === "number"
          ? maxHeight
          : parseInt(String(maxHeight), 10) || 220;

      el.style.height = "auto";
      const scrollH = el.scrollHeight;

      if (scrollH >= maxH) {
        el.style.height = `${maxH}px`;
        el.style.overflowY = "auto";
      } else {
        el.style.height = `${scrollH}px`;
        el.style.overflowY = "hidden";
      }
    }, [autoResize, maxHeight]);

    useEffect(() => {
      adjustHeight();
    }, [props.value, adjustHeight]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
    };

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--ink)]">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={innerRef}
          rows={rows}
          onChange={handleChange}
          style={{
            ...style,
            resize: autoResize ? "none" : (style?.resize ?? "vertical"),
          }}
          className={`bg-[var(--canvas)] text-[var(--ink)] border rounded px-3 py-2 text-sm placeholder:text-[var(--ink-muted)]/60 focus:outline-none focus:border-[var(--accent)] transition-colors duration-140 disabled:bg-[var(--surface)] disabled:cursor-not-allowed ${
            error
              ? "border-[#A4262C] focus:border-[#A4262C]"
              : "border-[var(--line-strong)]"
          } ${className}`}
          {...props}
        />
        {helper && !error && (
          <span className="text-xs text-[var(--ink-muted)]">{helper}</span>
        )}
        {error && <span className="text-xs text-[#A4262C]">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
