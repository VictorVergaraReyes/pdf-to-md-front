// Implementación simulada del pipeline para usar la interfaz sin backend real.
// Reproduce las fases de subida (progreso) y procesamiento (espera) y devuelve
// un texto de ejemplo. Se activa automáticamente si faltan los endpoints.
import { PresignResponse, ScanError } from "./types";
import type { ProgressCallback } from "./api";

export function mockPresign(): Promise<PresignResponse> {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ uploadUrl: "mock://s3" }), 400),
  );
}

/** Simula la subida emitiendo progreso incremental de 0 a 100. */
export function mockUpload(
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let percent = 0;
    const interval = setInterval(() => {
      if (signal.aborted) {
        clearInterval(interval);
        reject(new ScanError("unknown", "Subida cancelada."));
        return;
      }
      percent = Math.min(percent + 8, 100);
      onProgress(percent);
      if (percent >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 150);
  });
}

/** Simula el tiempo de OCR/IA y devuelve texto de ejemplo. */
export function mockResult(signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(SAMPLE_TEXT), 3500);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new ScanError("unknown", "Proceso cancelado."));
      },
      { once: true },
    );
  });
}

const SAMPLE_TEXT = `DOCUMENTO DE EJEMPLO — TEXTO EXTRAÍDO

Este es un resultado simulado generado por el modo de demostración del
PDF Scanner. Configura la variable de entorno NEXT_PUBLIC_PRESIGN_ENDPOINT
para conectar con el backend real en AWS.

Resumen
-------
El pipeline serverless recibe el archivo a través de una URL pre-firmada,
lo almacena en S3 y dispara una función Lambda que invoca a Amazon Textract
(o MarkItDown) para extraer el texto plano del documento.

Características demostradas:
  • Validación de formato y tamaño en el cliente.
  • Barra de progreso real durante la subida.
  • Estado de "procesando con IA" mientras se ejecuta el OCR.
  • Copiado al portapapeles y descarga como archivo .txt.

Fin del documento de ejemplo.`;
