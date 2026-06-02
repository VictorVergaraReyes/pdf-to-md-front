// Tipos compartidos del flujo de escaneo de PDF.

/** Estados posibles de la máquina de estados del flujo de carga/procesamiento. */
export type ScanStatus =
  | "idle" // Sin archivo seleccionado.
  | "selected" // Archivo válido seleccionado, listo para procesar.
  | "uploading" // Fase 1: subiendo a S3 (con progreso real).
  | "processing" // Fase 2: el backend está extrayendo el texto (OCR/IA).
  | "done" // Texto extraído disponible.
  | "error"; // Ocurrió un fallo en cualquier fase.

/** Códigos de error usados para mostrar mensajes amigables (RF-04). */
export type ScanErrorCode =
  | "invalid_file" // Extensión/MIME no permitido o archivo corrupto.
  | "too_large" // Supera el límite de tamaño en cliente.
  | "network" // Error de red durante la subida.
  | "url_expired" // La URL pre-firmada expiró o fue rechazada por S3.
  | "timeout" // El procesamiento excedió el tiempo límite.
  | "password_protected" // El PDF está protegido con contraseña.
  | "server" // Error genérico del backend.
  | "unknown"; // Cualquier otro fallo no clasificado.

/** Error tipado del dominio para distinguir escenarios de fallo. */
export class ScanError extends Error {
  readonly code: ScanErrorCode;

  constructor(code: ScanErrorCode, message: string) {
    super(message);
    this.name = "ScanError";
    this.code = code;
  }
}

/** Respuesta de la Lambda firmadora con la URL de subida temporal. */
export interface PresignResponse {
  /** URL pre-firmada para hacer PUT directo a S3. */
  uploadUrl: string;
}
