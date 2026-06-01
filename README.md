# PDF Scanner — Front-End

Interfaz web para extraer texto plano de archivos PDF (digitales o escaneados)
mediante un pipeline serverless en AWS (S3 + Lambda + Textract/MarkItDown).

Construido con **Next.js 16 (App Router)**, **TypeScript** y **Tailwind CSS 4**.

## Características

- **Carga drag & drop** con validación en cliente: solo `.pdf`, máximo 50 MB (RF-01).
- **Feedback por fases** (RF-02): barra de progreso real durante la subida a S3 y
  loader de "procesando con IA" durante el OCR.
- **Visualizador** del texto extraído con scroll, que preserva saltos de línea,
  más acciones de **copiar al portapapeles** y **descargar .txt** (RF-03).
- **Manejo de errores** amigable: archivo inválido, red/URL expirada, timeout y
  PDF protegido con contraseña (RF-04).
- **Modo claro/oscuro** (oscuro por defecto) y diseño responsivo y accesible (RNF-01).
- **Sin credenciales en el navegador**: toda la interacción con AWS usa URLs
  pre-firmadas (RNF-03).

## Arquitectura del flujo

1. El usuario selecciona/arrastra un PDF (validación en cliente).
2. Se solicita una URL pre-firmada a la Lambda firmadora (`presign`).
3. El archivo se sube por `PUT` directo a S3 con `Content-Type: application/pdf`
   y progreso real (vía `XMLHttpRequest`).
4. Se consulta el estado del procesamiento (polling) hasta obtener el resultado.
5. Se renderiza el texto extraído.

La lógica vive en `src/lib/api.ts` y la máquina de estados en
`src/hooks/usePdfScanner.ts`.

## Configuración

Copia `.env.example` a `.env.local` y define los endpoints del backend:

```bash
NEXT_PUBLIC_PRESIGN_ENDPOINT=https://.../presign
NEXT_PUBLIC_RESULT_ENDPOINT=https://.../result
```

Si los endpoints quedan vacíos, la app arranca en **modo demostración**
(procesamiento simulado), útil para probar la interfaz sin backend.

### Contrato esperado del backend

- `POST {PRESIGN_ENDPOINT}` con `{ filename, contentType, size }` →
  `{ uploadUrl, jobId }`.
- `GET {RESULT_ENDPOINT}?jobId=...` →
  `{ status: "pending" | "done" | "error", text?, errorCode?, message? }`.

## Desarrollo

```bash
npm run dev     # servidor de desarrollo (http://localhost:3000)
npm run build   # build de producción
npm run lint    # ESLint
```
