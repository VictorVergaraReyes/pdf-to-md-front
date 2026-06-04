import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// App 100% client-side (sin ISR ni caché de servidor), así que no se
// configura incrementalCache/R2. Si en el futuro se añaden rutas con ISR o
// `use cache`, habría que añadir un override de incrementalCache (p. ej. R2).
export default defineCloudflareConfig({});
