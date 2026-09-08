

export function generateReference() {
  return `MNDM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
