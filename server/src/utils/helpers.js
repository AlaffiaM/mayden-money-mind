// Shared utility functions — reference generation
// Generates unique payment references like "MNDM-1689012345678-A3B9K2"
export function generateReference() {
  return `MNDM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
