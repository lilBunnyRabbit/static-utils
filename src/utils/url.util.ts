const BASE_URL = import.meta.env.BASE_URL.replace(/\/+$/, "");

export function baseUrl(path: string) {
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}
