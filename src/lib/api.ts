// Capa de servicio: encapsula la integración con AWS según el patrón de URLs
// pre-firmadas (sección 2 del PRD). Incluye un modo simulado (mock) para poder
// usar toda la interfaz sin un backend real.
import {
  ACCEPTED_MIME,
  POLL_INTERVAL_MS,
  PRESIGN_ENDPOINT,
  PROCESSING_TIMEOUT_MS,
  RESULT_ENDPOINT,
  USE_MOCK,
} from "./config";
import {
  PresignResponse,
  ResultResponse,
  ScanError,
  ScanErrorCode,
} from "./types";
import { mockPresign, mockUpload, mockResult } from "./mock";

/** Callback de progreso de subida (0..100). */
export type ProgressCallback = (percent: number) => void;

/**
 * Paso 2 del flujo: solicita una URL de subida temporal a la Lambda firmadora.
 */
export async function requestPresignedUrl(
  file: File,
  signal: AbortSignal,
): Promise<PresignResponse> {
  if (USE_MOCK) return mockPresign(file);

  let response: Response;
  try {
    response = await fetch(PRESIGN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: ACCEPTED_MIME,
        size: file.size,
      }),
      signal,
    });
  } catch {
    throw new ScanError(
      "network",
      "No se pudo contactar al servidor. Verifica tu conexión e inténtalo de nuevo.",
    );
  }

  if (!response.ok) {
    throw new ScanError(
      "server",
      "El servidor no pudo generar la URL de subida. Inténtalo más tarde.",
    );
  }

  const data = (await response.json()) as Partial<PresignResponse>;
  if (!data.uploadUrl || !data.jobId) {
    throw new ScanError("server", "Respuesta inválida del servidor.");
  }
  return { uploadUrl: data.uploadUrl, jobId: data.jobId };
}

/**
 * Paso 3 del flujo: sube el binario directamente a S3 mediante PUT con
 * progreso real. Se usa XMLHttpRequest porque `fetch` no expone el progreso
 * de subida. La cabecera Content-Type debe coincidir con la firma (RNF-02).
 */
export function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<void> {
  if (USE_MOCK) return mockUpload(onProgress, signal);

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", ACCEPTED_MIME);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else if (xhr.status === 403) {
        // S3 devuelve 403 cuando la URL pre-firmada expiró o es inválida.
        reject(
          new ScanError(
            "url_expired",
            "La URL de subida expiró. Vuelve a intentar el proceso.",
          ),
        );
      } else {
        reject(
          new ScanError(
            "network",
            `Error al subir el archivo (código ${xhr.status}).`,
          ),
        );
      }
    };

    xhr.onerror = () =>
      reject(
        new ScanError(
          "network",
          "Error de red durante la subida. Verifica tu conexión.",
        ),
      );

    xhr.onabort = () =>
      reject(new ScanError("unknown", "Subida cancelada."));

    // Permite cancelar la subida desde la UI.
    signal.addEventListener("abort", () => xhr.abort(), { once: true });

    xhr.send(file);
  });
}

/**
 * Paso 4 y 5 del flujo: consulta el estado del procesamiento hasta obtener el
 * texto extraído, con un tiempo límite (RF-04: timeout).
 */
export async function waitForResult(
  jobId: string,
  signal: AbortSignal,
): Promise<string> {
  if (USE_MOCK) return mockResult(signal);

  const deadline = Date.now() + PROCESSING_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (signal.aborted) throw new ScanError("unknown", "Proceso cancelado.");

    const result = await fetchResult(jobId, signal);

    if (result.status === "done" && typeof result.text === "string") {
      return result.text;
    }
    if (result.status === "error") {
      const code: ScanErrorCode = result.errorCode ?? "server";
      throw new ScanError(
        code,
        result.message ?? "El procesamiento del documento falló.",
      );
    }

    await delay(POLL_INTERVAL_MS, signal);
  }

  throw new ScanError(
    "timeout",
    "El procesamiento tardó demasiado. Inténtalo de nuevo con un archivo más pequeño.",
  );
}

/** Consulta puntual del estado del trabajo. */
async function fetchResult(
  jobId: string,
  signal: AbortSignal,
): Promise<ResultResponse> {
  let response: Response;
  try {
    const url = new URL(RESULT_ENDPOINT);
    url.searchParams.set("jobId", jobId);
    response = await fetch(url.toString(), { signal });
  } catch {
    throw new ScanError(
      "network",
      "Se perdió la conexión mientras se procesaba el documento.",
    );
  }

  if (!response.ok) {
    throw new ScanError("server", "El servidor devolvió un error al consultar el estado.");
  }
  return (await response.json()) as ResultResponse;
}

/** Espera `ms` milisegundos, cancelable mediante AbortSignal. */
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
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
