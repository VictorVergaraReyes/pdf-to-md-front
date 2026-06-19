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
      method: "POST",
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
  if (!data.uploadUrl || !data.uploadFields || !data.downloadUrl) {
    throw new ScanError("server", "Respuesta inválida del servidor.");
  }
  return { uploadUrl: data.uploadUrl, uploadFields: data.uploadFields, downloadUrl: data.downloadUrl };
}

/**
 * Paso 3 del flujo: sube el binario directamente a S3 mediante PUT con
 * progreso real. Se usa XMLHttpRequest porque `fetch` no expone el progreso
 * de subida. La cabecera Content-Type debe coincidir con la firma (RNF-02).
 */
export function uploadToS3(
  uploadUrl: string,
  uploadFields: Record<string, string>,  // campos que regresa Lambda
  file: File,
  onProgress: ProgressCallback,
  signal: AbortSignal,
): Promise<void> {
  if (USE_MOCK) return mockUpload(onProgress, signal);

  return new Promise<void>((resolve, reject) => {
    // Construir el FormData con los campos de S3
    const formData = new FormData();

    // Agregar todos los campos firmados primero
    Object.entries(uploadFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // El archivo SIEMPRE debe ser el último campo
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);
    // ⚠️ NO setear Content-Type — el navegador lo pone automáticamente con el boundary

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

    signal.addEventListener("abort", () => xhr.abort(), { once: true });

    // ✅ Enviar el FormData en lugar del archivo directo
    xhr.send(formData);
  });
}

/**
 * Paso final (modo demostración): devuelve texto simulado para poder probar el
 * visor de resultados sin backend real.
 */
export function getExtractedText(signal: AbortSignal): Promise<string> {
  return mockResult(signal);
}

/**
 * Paso final (flujo real): descarga el documento convertido a Markdown desde la
 * URL pre-firmada devuelta por la Lambda firmadora.
 *
 * El objeto `.md` no existe inmediatamente: el backend lo genera de forma
 * asíncrona tras la subida del PDF. Mientras tanto S3 responde 403/404 a la URL
 * pre-firmada, así que se sondea con reintentos hasta que el documento esté
 * disponible (o se agote el presupuesto de tiempo, manteniéndose por debajo de
 * la expiración de ~10 min de la URL).
 */
export async function fetchConvertedMarkdown(
  downloadUrl: string,
  signal: AbortSignal,
): Promise<string> {
  const INITIAL_DELAY_MS = 3000; // Margen tras la subida antes de descargar el .md.
  const POLL_INTERVAL_MS = 2000;
  const MAX_ATTEMPTS = 60; // ~3 min de sondeo, dentro de la expiración de la URL.

  // Espera inicial entre la subida del PDF y el primer intento de descarga,
  // dando margen a que el backend empiece a generar el documento convertido.
  await delay(INITIAL_DELAY_MS, signal);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (signal.aborted) throw new ScanError("unknown", "Proceso cancelado.");

    let response: Response;
    try {
      response = await fetch(downloadUrl, { method: "GET", signal });
    } catch {
      if (signal.aborted) throw new ScanError("unknown", "Proceso cancelado.");
      throw new ScanError(
        "network",
        "No se pudo descargar el documento convertido. Verifica tu conexión.",
      );
    }

    if (response.ok) return response.text();

    // 403/404: la conversión aún no terminó; esperar y reintentar.
    if (response.status === 403 || response.status === 404) {
      await delay(POLL_INTERVAL_MS, signal);
      continue;
    }

    throw new ScanError(
      "server",
      `No se pudo descargar el documento convertido (código ${response.status}).`,
    );
  }

  throw new ScanError(
    "timeout",
    "El procesamiento del documento tardó demasiado. Inténtalo de nuevo.",
  );
}

/** Espera `ms` milisegundos, abortable mediante la señal del flujo. */
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
