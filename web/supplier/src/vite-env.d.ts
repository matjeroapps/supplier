/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ZITADEL_ISSUER?: string;
  readonly VITE_ZITADEL_CLIENT_ID?: string;
  readonly VITE_ZITADEL_PROJECT_ID?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ZITADEL_REDIRECT_URI?: string;
  readonly VITE_ZITADEL_POST_LOGOUT_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
