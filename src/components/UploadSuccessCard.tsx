"use client";

// Confirmación mostrada cuando la subida del PDF a S3 finaliza con éxito en el
// flujo real. El backend no expone un endpoint de resultado, por lo que la
// subida es el último paso y no hay texto extraído que mostrar.
import { CheckIcon } from "./Icons";

interface UploadSuccessCardProps {
  /** Nombre del archivo subido, para confirmarlo al usuario. */
  fileName: string;
  onReset: () => void;
}

export function UploadSuccessCard({ fileName, onReset }: UploadSuccessCardProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckIcon className="h-6 w-6" />
      </span>

      <div className="space-y-1">
        <h2 className="text-base font-medium text-foreground">
          Documento subido correctamente
        </h2>
        <p className="text-sm text-muted">
          <span className="font-medium text-foreground">{fileName}</span> se
          envió a AWS S3 y quedó en cola para su procesamiento.
        </p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="text-sm text-accent underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
      >
        Escanear otro documento
      </button>
    </div>
  );
}
