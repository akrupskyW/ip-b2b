/**
 * Built-in avatar starters — five SVG art patterns plus two professional
 * portraits. Organization Profile writes one of these (or a member upload)
 * through the shared user-avatar store; the All Modules catalog renders the
 * same set so the previews cannot drift from the live picker.
 *
 * SVG presets store as data URLs; photo presets use a local asset path
 * relative to pages/*.html.
 */

export const AVATAR_PRESETS = [
  {
    id: 'aurora', label: 'Aurora',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><radialGradient id='a' cx='28%' cy='30%' r='75%'><stop offset='0' stop-color='#5eead4'/><stop offset='1' stop-color='#5eead4' stop-opacity='0'/></radialGradient><radialGradient id='b' cx='78%' cy='38%' r='75%'><stop offset='0' stop-color='#a78bfa'/><stop offset='1' stop-color='#a78bfa' stop-opacity='0'/></radialGradient><radialGradient id='c' cx='52%' cy='82%' r='80%'><stop offset='0' stop-color='#f472b6'/><stop offset='1' stop-color='#f472b6' stop-opacity='0'/></radialGradient></defs><rect width='96' height='96' fill='#0b1220'/><rect width='96' height='96' fill='url(#a)'/><rect width='96' height='96' fill='url(#b)'/><rect width='96' height='96' fill='url(#c)'/></svg>`,
  },
  {
    id: 'prism', label: 'Prism',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f59e0b'/><stop offset='1' stop-color='#ef4444'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><path d='M0 0 L48 0 L0 48 Z' fill='#fff' fill-opacity='0.20'/><path d='M96 0 L96 48 L48 0 Z' fill='#000' fill-opacity='0.12'/><path d='M0 96 L48 96 L0 48 Z' fill='#000' fill-opacity='0.16'/><path d='M96 96 L96 48 L48 96 Z' fill='#fff' fill-opacity='0.16'/><path d='M48 0 L96 48 L48 96 L0 48 Z' fill='#fff' fill-opacity='0.07'/></svg>`,
  },
  {
    id: 'orbit', label: 'Orbit',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#6366f1'/><stop offset='1' stop-color='#0ea5e9'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><g fill='none' stroke='#fff'><circle cx='48' cy='48' r='10' stroke-width='3' stroke-opacity='0.55'/><circle cx='48' cy='48' r='20' stroke-width='2.5' stroke-opacity='0.38'/><circle cx='48' cy='48' r='30' stroke-width='2' stroke-opacity='0.26'/><circle cx='48' cy='48' r='40' stroke-width='1.5' stroke-opacity='0.18'/></g><circle cx='48' cy='48' r='4' fill='#fff'/></svg>`,
  },
  {
    id: 'tide', label: 'Tide',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#22d3ee'/><stop offset='1' stop-color='#3b82f6'/></linearGradient></defs><rect width='96' height='96' fill='url(#g)'/><path d='M0 40 Q24 24 48 40 T96 40 V96 H0 Z' fill='#fff' fill-opacity='0.16'/><path d='M0 56 Q24 40 48 56 T96 56 V96 H0 Z' fill='#fff' fill-opacity='0.16'/><path d='M0 72 Q24 56 48 72 T96 72 V96 H0 Z' fill='#0b1220' fill-opacity='0.18'/></svg>`,
  },
  {
    id: 'bloom', label: 'Bloom',
    svg: `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'><defs><radialGradient id='g' cx='50%' cy='28%' r='85%'><stop offset='0' stop-color='#34d399'/><stop offset='1' stop-color='#059669'/></radialGradient></defs><rect width='96' height='96' fill='url(#g)'/><g fill='#fff'><circle cx='26' cy='30' r='7' fill-opacity='0.9'/><circle cx='62' cy='22' r='5' fill-opacity='0.7'/><circle cx='72' cy='52' r='9' fill-opacity='0.85'/><circle cx='40' cy='58' r='6' fill-opacity='0.75'/><circle cx='22' cy='70' r='5' fill-opacity='0.65'/><circle cx='58' cy='74' r='7' fill-opacity='0.9'/></g></svg>`,
  },
  { id: 'portrait-m', label: 'Professional man', src: '../assets/avatars/avatar-portrait-male.jpg' },
  { id: 'portrait-f', label: 'Professional woman', src: '../assets/avatars/avatar-portrait-female.jpg' },
];

export function avatarPresetDataUrl(svg) {
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export function avatarPresetSrc(preset) {
  return preset.src || avatarPresetDataUrl(preset.svg);
}
