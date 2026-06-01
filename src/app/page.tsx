import { Scanner } from "@/components/Scanner";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            PDF Scanner
          </h1>
          <p className="mt-1 text-sm text-muted">
            Extrae el texto plano de tus PDF (digitales o escaneados) con IA.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1">
        <Scanner />
      </main>

      <footer className="mt-10 text-center text-xs text-muted">
        Tus archivos se suben de forma segura mediante URLs temporales. No se
        almacenan credenciales en el navegador.
      </footer>
    </div>
  );
}
