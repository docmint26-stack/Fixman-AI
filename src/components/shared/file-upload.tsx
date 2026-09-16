"use client";

import * as React from "react";
import { Upload, Paperclip, X } from "lucide-react";
import { cn } from "cn";

export function FileUploadZone({
  onFiles,
  accept = "*",
  multiple = false,
  label,
  className,
}: {
  onFiles?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  className?: string;
}) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles?.(files);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-8 text-center transition-all hover:border-primary/40 hover:bg-primary/5",
        drag && "border-primary bg-primary/5",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles?.(files);
          e.target.value = "";
        }}
      />
      <span className="relative grid size-10 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors group-hover:text-primary">
        <Upload className="size-4" />
      </span>
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">
          {label || "Drop files here, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, PDF, TXT, LOG — up to 10 MB
        </p>
      </div>
    </div>
  );
}

export function FileChip({ name, onRemove }: { name: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card pl-2.5 pr-1.5 text-xs font-medium text-foreground ring-1 ring-foreground/5">
      <Paperclip className="size-3 text-muted-foreground" />
      {name}
      {onRemove && (
        <button onClick={onRemove} className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}