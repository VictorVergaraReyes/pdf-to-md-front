"use client";

// Componente principal que compone el flujo completo según el estado actual.
import { usePdfScanner } from "@/hooks/usePdfScanner";
import { USE_MOCK } from "@/lib/config";
import { FileDropzone } from "./FileDropzone";
import { SelectedFileCard } from "./SelectedFileCard";
import { ResultViewer } from "./ResultViewer";
import { ErrorBanner } from "./ErrorBanner";

export function Scanner() {
  const scanner = usePdfScanner();
  const { status, file, progress, text, error } = scanner;

  return (
    <div className="space-y-5">
      {USE_MOCK && (
        <p className="rounded-lg border border-border bg-surface px-4 py-2 text-center text-xs text-muted">
          Modo demostración: el procesamiento es simulado. Configura los
          endpoints de AWS para usar el backend real.
        </p>
      )}

      {/* Estado inicial: zona de carga. */}
      {status === "idle" && <FileDropzone onSelect={scanner.selectFile} />}

      {/* Error previo a la selección (p. ej. archivo inválido): mostrar dropzone + banner. */}
      {status === "error" && !file && (
        <>
          <FileDropzone onSelect={scanner.selectFile} />
          {error && (
            <ErrorBanner
              code={error.code}
              message={error.message}
              onDismiss={scanner.reset}
            />
          )}
        </>
      )}

      {/* Archivo seleccionado / subiendo / procesando. */}
      {file && (status === "selected" || status === "uploading" || status === "processing") && (
        <SelectedFileCard
          file={file}
          status={status}
          progress={progress}
          onProcess={scanner.process}
          onRemove={scanner.reset}
        />
      )}

      {/* Error tras la selección: tarjeta del archivo + banner con reintento. */}
      {file && status === "error" && (
        <>
          <SelectedFileCard
            file={file}
            status={status}
            progress={progress}
            onProcess={scanner.process}
            onRemove={scanner.reset}
          />
          {error && (
            <ErrorBanner
              code={error.code}
              message={error.message}
              onRetry={scanner.retry}
              onDismiss={scanner.reset}
            />
          )}
        </>
      )}

      {/* Resultado final. */}
      {status === "done" && text !== null && (
        <ResultViewer
          text={text}
          sourceName={file?.name ?? "documento.pdf"}
          onReset={scanner.reset}
        />
      )}
    </div>
  );
}
