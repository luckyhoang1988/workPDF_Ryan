export function useRequestHeaders(): HeadersInit {
  const token = localStorage.getItem("ryanpdf_jwt");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
