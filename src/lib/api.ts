// Capa de servicio: encapsula la integración con AWS según el patrón de URLs
// pre-firmadas (sección 2 del PRD). Incluye un modo simulado (mock) para poder
// usar toda la interfaz sin un backend real.
import { ACCEPTED_MIME, PRESIGN_ENDPOINT, USE_MOCK } from "./config";
import { PresignResponse, ScanError } from "./types";
import { mockPresign, mockUpload, mockResult } from "./mock";

/** Callback de progreso de subida (0..100). */
export type ProgressCallback = (percent: number) => void;

/**
 * Paso 2 del flujo: solicita una URL de subida temporal a la Lambda firmadora.
 */
export async function requestPresignedUrl(
  fileName: string,
  signal: AbortSignal,
): Promise<PresignResponse> {
  if (USE_MOCK) return mockPresign();

  let response: Response;
  try {
    // La Lambda firmadora genera la URL pre-firmada de S3 y no requiere body.
    // Devuelve { uploadUrl, key } y firma la cabecera `content-type`, por lo que
    // el PUT posterior debe enviar exactamente `application/pdf` (ver uploadToS3).
    const url = new URL(PRESIGN_ENDPOINT);
    url.searchParams.set("fileName", fileName);
    response = await fetch(url.toString(), {
      method: "GET",
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
  console.log("Respuesta de presign", data);
  if (!data.uploadUrl) {
    throw new ScanError("server", "Respuesta inválida del servidor.");
  }
  return { uploadUrl: data.uploadUrl };
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
 * Paso final: obtiene el texto extraído del documento.
 *
 * El backend real no expone un endpoint de resultado, por lo que la subida a S3
 * es el último paso del flujo real y esta función devuelve `null` (la UI muestra
 * una confirmación de subida). En modo demostración se devuelve texto simulado
 * para poder probar el visor de resultados.
 */
export function getExtractedText(signal: AbortSignal): Promise<string | null> {
  if (USE_MOCK) return mockResult(signal);
  return Promise.resolve(null);
}
