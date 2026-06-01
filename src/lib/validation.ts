// Validación de archivos en el cliente (RF-01).
import { ACCEPTED_EXTENSION, ACCEPTED_MIME, MAX_FILE_SIZE } from "./config";
import { ScanError } from "./types";
import { formatBytes } from "./format";

/**
 * Valida que el archivo cumpla las restricciones de formato y tamaño.
 * Lanza un ScanError tipado si no es válido para que la UI muestre el mensaje
 * apropiado.
 */
export function validatePdfFile(file: File): void {
  const isPdfExtension = file.name.toLowerCase().endsWith(ACCEPTED_EXTENSION);
  // Algunos navegadores no reportan el MIME; basta con que coincida la extensión.
  const isPdfMime = file.type === "" || file.type === ACCEPTED_MIME;

  if (!isPdfExtension || !isPdfMime) {
    throw new ScanError(
      "invalid_file",
      "El archivo no es un PDF válido. Solo se admiten archivos .pdf.",
    );
  }

  if (file.size === 0) {
    throw new ScanError(
      "invalid_file",
      "El archivo parece estar vacío o corrupto.",
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ScanError(
      "too_large",
      `El archivo supera el límite de ${formatBytes(MAX_FILE_SIZE)}.`,
    );
  }
}
