export const MODELS_BASE_URL =
  (import.meta.env.VITE_MODELS_BASE_URL as string | undefined) || (import.meta.env.PROD ? "/api/models" : "/models");
