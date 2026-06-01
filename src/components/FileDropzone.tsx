"use client";

// Zona de arrastrar y soltar / selección de archivo (RF-01).
import { useCallback, useId, useRef, useState } from "react";
import { ACCEPTED_EXTENSION, MAX_FILE_SIZE } from "@/lib/config";
import { formatBytes } from "@/lib/format";
import { UploadIcon } from "./Icons";

interface FileDropzoneProps {
  onSelect: (file: File) => void;
}

export function FileDropzone({ onSelect }: FileDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onSelect(file);
    },
    [onSelect],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsDragging(false);
      handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      className={`group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-background ${
        isDragging
          ? "border-accent bg-accent/10"
          : "border-border bg-surface hover:border-accent/60 hover:bg-surface-hover"
      }`}
    >
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
          isDragging ? "bg-accent/20 text-accent" : "bg-surface-hover text-muted group-hover:text-accent"
        }`}
      >
        <UploadIcon className="h-7 w-7" />
      </span>

      <span className="space-y-1">
        <span className="block text-base font-medium text-foreground">
          Arrastra tu PDF aquí o{" "}
          <span className="text-accent underline-offset-2 group-hover:underline">
            selecciónalo
          </span>
        </span>
        <span className="block text-sm text-muted">
          Solo archivos {ACCEPTED_EXTENSION} · máximo {formatBytes(MAX_FILE_SIZE)}
        </span>
      </span>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files);
          // Permite volver a seleccionar el mismo archivo tras cancelar.
          e.target.value = "";
        }}
      />
    </label>
  );
}
