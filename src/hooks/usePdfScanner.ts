"use client";

// Hook que orquesta toda la máquina de estados del flujo de escaneo:
// selección → subida (progreso) → procesamiento → resultado / error.
import { useCallback, useRef, useState } from "react";
import {
  fetchConvertedMarkdown,
  getExtractedText,
  requestPresignedUrl,
  uploadToS3,
} from "@/lib/api";
import { USE_MOCK } from "@/lib/config";
import { buildFileName, downloadTextFile } from "@/lib/download";
import { ScanError, ScanErrorCode, ScanStatus } from "@/lib/types";
import { validatePdfFile } from "@/lib/validation";

interface ScanState {
  status: ScanStatus;
  file: File | null;
  /** Progreso de subida 0..100 (fase 1). */
  progress: number;
  /** Texto extraído cuando status === "done". */
  text: string | null;
  /** Error legible cuando status === "error". */
  error: { code: ScanErrorCode; message: string } | null;
}

const INITIAL_STATE: ScanState = {
  status: "idle",
  file: null,
  progress: 0,
  text: null,
  error: null,
};

export function usePdfScanner() {
  const [state, setState] = useState<ScanState>(INITIAL_STATE);
  // Controla la cancelación de las peticiones en curso.
  const abortRef = useRef<AbortController | null>(null);

  /** Selecciona y valida un archivo (RF-01). */
  const selectFile = useCallback((file: File) => {
    try {
      validatePdfFile(file);
      setState({ ...INITIAL_STATE, status: "selected", file });
    } catch (err) {
      const scanError =
        err instanceof ScanError
          ? err
          : new ScanError("invalid_file", "Archivo no válido.");
      setState({
        ...INITIAL_STATE,
        status: "error",
        file: null,
        error: { code: scanError.code, message: scanError.message },
      });
    }
  }, []);

  /** Cancela el proceso en curso y limpia la selección. */
  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState(INITIAL_STATE);
  }, []);

  /** Ejecuta el pipeline completo: presign → upload → poll resultado. */
  const process = useCallback(async (file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    try {
      setState((s) => ({ ...s, status: "uploading", progress: 0, error: null }));

      const { uploadUrl, uploadFields, downloadUrl } = await requestPresignedUrl(
        file.name,
        signal,
      );

      const onProgress = (progress: number) => {
        setState((s) => ({ ...s, progress }));
      };

      await uploadToS3(uploadUrl, uploadFields, file, onProgress, signal)

      // Tras la subida, el backend convierte el PDF a Markdown de forma
      // asíncrona; mientras tanto mostramos la fase de procesamiento.
      setState((s) => ({ ...s, status: "processing" }));

      // En demostración se simula el OCR; en el flujo real se descarga el
      // documento convertido (.md) desde la URL pre-firmada, sondeándola hasta
      // que esté disponible.
      const text = USE_MOCK
        ? await getExtractedText(signal)
        : await fetchConvertedMarkdown(downloadUrl, signal);

      // Descarga automática del documento convertido a Markdown.
      downloadTextFile(text, buildFileName(file.name, ".md"));

      setState((s) => ({ ...s, status: "done", text }));
    } catch (err) {
      // Una cancelación intencional no debe mostrarse como error.
      if (signal.aborted) return;
      const scanError =
        err instanceof ScanError
          ? err
          : new ScanError("unknown", "Ocurrió un error inesperado.");
      setState((s) => ({
        ...s,
        status: "error",
        error: { code: scanError.code, message: scanError.message },
      }));
    } finally {
      abortRef.current = null;
    }
  }, []);

  /** Reintenta el procesamiento del archivo ya seleccionado. */
  const retry = useCallback(() => {
    if (state.file) {
      void process(state.file);
    } else {
      setState(INITIAL_STATE);
    }
  }, [state.file, process]);

  return {
    ...state,
    selectFile,
    process: () => state.file && process(state.file),
    reset,
    retry,
  };
}
