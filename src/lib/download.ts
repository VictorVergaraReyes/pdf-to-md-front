// Utilidades para disparar la descarga de un archivo de texto en el navegador.

/**
 * Fuerza la descarga de `text` como un archivo con el nombre y MIME indicados.
 * Crea un Blob local y un enlace temporal, evitando depender del atributo
 * `download` en URLs cross-origin (que el navegador ignora).
 */
export function downloadTextFile(
  text: string,
  fileName: string,
  mime = "text/markdown;charset=utf-8",
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Reemplaza (o añade) la extensión del nombre de origen por `ext`. */
export function buildFileName(sourceName: string, ext: string): string {
  const base = sourceName.replace(/\.[^/.]+$/, "");
  const clean = ext.startsWith(".") ? ext : `.${ext}`;
  return `${base || "documento"}${clean}`;
}
