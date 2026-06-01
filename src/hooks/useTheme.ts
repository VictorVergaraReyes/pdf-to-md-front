"use client";

// Gestiona el tema claro/oscuro con persistencia en localStorage.
// El modo oscuro es el predeterminado (RNF-01).
// Se usa useSyncExternalStore para leer la clase aplicada en <html> por el
// script anti-parpadeo sin provocar setState en efectos ni desajustes de
// hidratación.
import { useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "pdf-scanner-theme";

// Suscriptores locales notificados al alternar el tema.
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  // En el servidor asumimos el predeterminado (oscuro).
  return "dark";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.toggle("light", next === "light");
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem(STORAGE_KEY, next);
    listeners.forEach((listener) => listener());
  }, [theme]);

  return { theme, toggleTheme };
}
