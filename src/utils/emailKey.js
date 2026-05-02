export function emailKey(email) {
  if (email == null) return null;
  const t = String(email).trim().toLowerCase();
  return t || null;
}
