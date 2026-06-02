// Configuración del cliente. Todos los valores son públicos (NEXT_PUBLIC_*)
// porque el Front-End nunca maneja credenciales de AWS (RNF-03): solo URLs
// temporales provistas por la Lambda firmadora.

/** Tamaño máximo permitido del archivo en bytes (50 MB, RF-01). */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/** Extensión y MIME admitidos. */
export const ACCEPTED_EXTENSION = ".pdf";
export const ACCEPTED_MIME = "application/pdf";

/**
 * Endpoint de la Lambda firmadora que devuelve la URL pre-firmada.
 * Si no está configurado, la app funciona en modo simulado (mock) para demo.
 */
export const PRESIGN_ENDPOINT = process.env.NEXT_PUBLIC_PRESIGN_ENDPOINT ?? "";

/**
 * Modo simulado: activo cuando se fuerza por env o cuando falta el endpoint de
 * firma. Permite probar toda la interfaz —incluido el visor de texto— sin un
 * backend real.
 */
export const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK == "true" || PRESIGN_ENDPOINT === "";
