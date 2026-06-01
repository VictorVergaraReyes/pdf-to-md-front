"use client";

// Banner de error amigable con título por escenario y acción de reintento (RF-04).
import { ScanErrorCode } from "@/lib/types";
import { AlertIcon } from "./Icons";

interface ErrorBannerProps {
  code: ScanErrorCode;
  message: string;
  /** Reintenta el procesamiento (solo si hay un archivo válido). */
  onRetry?: () => void;
  /** Vuelve al inicio / elige otro archivo. */
  onDismiss: () => void;
}

/** Título corto según el tipo de error. */
const TITLES: Record<ScanErrorCode, string> = {
  invalid_file: "Archivo no válido",
  too_large: "Archivo demasiado grande",
  network: "Error de conexión",
  url_expired: "La subida expiró",
  timeout: "Tiempo de espera agotado",
  password_protected: "PDF protegido con contraseña",
  server: "Error del servidor",
  unknown: "Algo salió mal",
};

/** Errores en los que tiene sentido reintentar el mismo archivo. */
const RETRYABLE: ReadonlySet<ScanErrorCode> = new Set<ScanErrorCode>([
  "network",
  "url_expired",
  "timeout",
  "server",
  "unknown",
]);

export function ErrorBanner({
  code,
  message,
  onRetry,
  onDismiss,
}: ErrorBannerProps) {
  const canRetry = onRetry && RETRYABLE.has(code);

  return (
    <div
      role="alert"
      className="flex gap-4 rounded-2xl border border-danger/40 bg-danger/10 p-5"
    >
      <span className="mt-0.5 shrink-0 text-danger">
        <AlertIcon className="h-6 w-6" />
      </span>

      <div className="flex-1 space-y-3">
        <div>
          <p className="font-medium text-foreground">{TITLES[code]}</p>
          <p className="text-sm text-muted">{message}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-danger px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Reintentar
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Elegir otro archivo
          </button>
        </div>
      </div>
    </div>
  );
}
