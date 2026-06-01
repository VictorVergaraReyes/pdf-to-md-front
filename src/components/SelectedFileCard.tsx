"use client";

// Tarjeta que muestra el archivo seleccionado con nombre, tamaño y acciones
// (RF-01). Durante la subida/procesamiento muestra el estado de feedback (RF-02).
import { ScanStatus } from "@/lib/types";
import { formatBytes } from "@/lib/format";
import { FileIcon, SpinnerIcon, TrashIcon } from "./Icons";

interface SelectedFileCardProps {
  file: File;
  status: ScanStatus;
  progress: number;
  onProcess: () => void;
  onRemove: () => void;
}

export function SelectedFileCard({
  file,
  status,
  progress,
  onProcess,
  onRemove,
}: SelectedFileCardProps) {
  const isUploading = status === "uploading";
  const isProcessing = status === "processing";
  const isBusy = isUploading || isProcessing;

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <FileIcon className="h-6 w-6" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground" title={file.name}>
            {file.name}
          </p>
          <p className="text-sm text-muted">{formatBytes(file.size)}</p>
        </div>

        {/* El botón de eliminar permite cancelar la selección o el proceso. */}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Eliminar archivo"
          title="Eliminar archivo"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Fase 1: barra de progreso real de la subida (RF-02). */}
      {isUploading && (
        <div className="space-y-2" aria-live="polite">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subiendo a AWS S3…</span>
            <span className="font-medium text-foreground">{progress}%</span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-surface-hover"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Fase 2: loader de procesamiento con IA (RF-02). */}
      {isProcessing && (
        <div
          className="flex items-center gap-3 rounded-lg bg-surface-hover px-4 py-3 text-sm text-foreground"
          aria-live="polite"
        >
          <SpinnerIcon className="h-5 w-5 text-accent" />
          <span>Procesando documento con IA… esto puede tardar unos segundos.</span>
        </div>
      )}

      {/* Botón de acción principal. Se deshabilita durante el proceso (RF-02). */}
      {!isBusy && (
        <button
          type="button"
          onClick={onProcess}
          className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Procesar documento
        </button>
      )}
    </div>
  );
}
