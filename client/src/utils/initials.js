// "Brian Otieno Ouma" → "BO"; used for avatar circles.
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

// Avatar gradients, cycled by index.
const AVATAR_GRADIENTS = [
  'from-[#2563eb] to-[#1d4ed8]',
  'from-[#0d9488] to-[#0f766e]',
  'from-[#f59e0b] to-[#d97706]',
  'from-[#ef4444] to-[#dc2626]',
  'from-[#8b5cf6] to-[#7c3aed]',
];

export function avatarGradient(index) {
  return AVATAR_GRADIENTS[Math.abs(index) % AVATAR_GRADIENTS.length];
}
