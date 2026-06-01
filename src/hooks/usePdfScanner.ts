"use client";

// Hook que orquesta toda la máquina de estados del flujo de escaneo:
// selección → subida (progreso) → procesamiento → resultado / error.
import { useCallback, useRef, useState } from "react";
import { requestPresignedUrl, uploadToS3, waitForResult } from "@/lib/api";
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

      const { uploadUrl, jobId } = await requestPresignedUrl(file, signal);

      await uploadToS3(
        uploadUrl,
        file,
        (percent) => setState((s) => ({ ...s, progress: percent })),
        signal,
      );

      setState((s) => ({ ...s, status: "processing" }));

      const text = await waitForResult(jobId, signal);

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
