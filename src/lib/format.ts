// Utilidades de formato.

/** Convierte un número de bytes a una cadena legible (B, KB, MB). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  // Sin decimales para bytes, dos decimales para el resto.
  const formatted = exponent === 0 ? value.toString() : value.toFixed(2);
  return `${formatted} ${units[exponent]}`;
}
