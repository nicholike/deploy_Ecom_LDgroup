const normalizeUrl = (url: string) => {
  if (!url) {
    return "";
  }
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

export const API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1",
);
