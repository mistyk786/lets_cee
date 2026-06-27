/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend base URL, e.g. http://127.0.0.1:8000 */
  readonly VITE_API_BASE_URL?: string;
  /** When "true", skip network calls and always use mock data. */
  readonly VITE_USE_MOCK_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
