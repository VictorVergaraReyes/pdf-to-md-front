# PDF Scanner — Front-End

Interfaz web para extraer texto plano de archivos PDF (digitales o escaneados)
mediante un pipeline serverless en AWS (S3 + Lambda + Textract/MarkItDown).

Construido con **Next.js 16 (App Router)**, **TypeScript** y **Tailwind CSS 4**.

## Características

- **Carga drag & drop** con validación en cliente: solo `.pdf`, máximo 50 MB (RF-01).
- **Feedback por fases** (RF-02): barra de progreso real durante la subida a S3
  y confirmación al completarse. En **modo demostración** se simula además la
  fase de "procesando con IA" y se muestra texto de ejemplo.
- **Visualizador** del texto extraído con scroll, que preserva saltos de línea,
  más acciones de **copiar al portapapeles** y **descargar .txt** (RF-03). Solo
  en modo demostración, ya que el backend real no expone un endpoint de resultado.
- **Manejo de errores** amigable: archivo inválido, red/URL expirada, timeout y
  PDF protegido con contraseña (RF-04).
- **Modo claro/oscuro** (oscuro por defecto) y diseño responsivo y accesible (RNF-01).
- **Sin credenciales en el navegador**: toda la interacción con AWS usa URLs
  pre-firmadas (RNF-03).

## Arquitectura del flujo

1. El usuario selecciona/arrastra un PDF (validación en cliente).
2. Se solicita una URL pre-firmada a la Lambda firmadora (`presign`).
3. El archivo se sube por `PUT` directo a S3 con `Content-Type: application/pdf`
   y progreso real (vía `XMLHttpRequest`). La subida es el último paso del flujo
   real: al completarse se muestra una confirmación.

La lógica vive en `src/lib/api.ts` y la máquina de estados en
`src/hooks/usePdfScanner.ts`.

## Configuración

Copia `.env.example` a `.env.local` y define el endpoint del backend:

```bash
NEXT_PUBLIC_PRESIGN_ENDPOINT=https://.../presign
```

Si el endpoint queda vacío, la app arranca en **modo demostración**
(subida y resultado simulados), útil para probar la interfaz sin backend.

### Contrato esperado del backend

- `GET {PRESIGN_ENDPOINT}` → `{ uploadUrl }`. La URL pre-firmada firma la cabecera
  `content-type`, por lo que el `PUT` a S3 debe enviar `Content-Type: application/pdf`.

## Desarrollo

```bash
npm run dev     # servidor de desarrollo (http://localhost:3000)
npm run build   # build de producción
npm run lint    # ESLint
```
## Despligue