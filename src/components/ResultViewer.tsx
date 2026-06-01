"use client";

// Visualizador del texto extraído con acciones de copiar y descargar (RF-03).
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon, DownloadIcon } from "./Icons";

interface ResultViewerProps {
  text: string;
  /** Nombre del archivo original, usado para nombrar la descarga .txt. */
  sourceName: string;
  onReset: () => void;
}

export function ResultViewer({ text, sourceName, onReset }: ResultViewerProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpia el temporizador al desmontar para evitar fugas.
  useEffect(() => {
    return () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      // Feedback visual temporal de 2 segundos (RF-03).
      copyTimeout.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // El navegador puede bloquear el portapapeles sin gesto/HTTPS.
    }
  }, [text]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = buildTxtName(sourceName);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [text, sourceName]);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-medium text-foreground">Texto extraído</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copiar al portapapeles"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {copied ? (
              <>
                <CheckIcon className="h-4 w-4 text-success" />
                <span className="text-success">¡Copiado!</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-4 w-4" />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            aria-label="Descargar como archivo de texto"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <DownloadIcon className="h-4 w-4" />
            <span>Descargar .txt</span>
          </button>
        </div>
      </div>

      {/* Área de scroll dedicada que preserva saltos de línea y párrafos (RF-03). */}
      <div className="max-h-[420px] overflow-auto rounded-lg border border-border bg-background p-4">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-foreground">
          {text}
        </pre>
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

/** Reemplaza la extensión .pdf por .txt (o la añade si no la tiene). */
function buildTxtName(sourceName: string): string {
  const base = sourceName.replace(/\.pdf$/i, "");
  return `${base || "documento"}.txt`;
}
