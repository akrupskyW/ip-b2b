/**
 * Arc geometry shared by every ring, donut, pie, and gauge in the app.
 *
 * One definition of a rounded pie/donut slice, so the UPF and GRAS donuts on
 * the dashboard, the pie share, and the half donut on Analytics Types all
 * round their corners the same way instead of each page inventing a shape.
 *
 * Angles are degrees measured from the positive x-axis (3 o'clock), turning
 * clockwise on screen. A caller whose own charts put 0° at 12 o'clock passes
 * `angle - 90`.
 */

export function polarPt(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
}

/* Annular-sector path with gently rounded corners — a softer end than a fully
   round stroke cap (which is a half-circle of radius sw/2). `cr` is the corner
   radius, clamped so it never exceeds the slice's radial or angular room.
   `ri` of 0 draws a solid wedge instead of a ring segment: the two straight
   edges meet at the centre, and that point is filleted with the same radius,
   so a pie reads as the same family of shape as a donut. */
export function roundedSector(cx, cy, ri, ro, a0, a1, cr) {
  const spanRad = ((a1 - a0) * Math.PI) / 180;
  const P = (rad, deg) => polarPt(cx, cy, rad, deg);
  const DEG = 180 / Math.PI;

  if (ri <= 0) {
    /* A wedge rounds at the rim only. Its tip is a far sharper corner, so the
       same radius reads much larger there — filleting it stops the slices
       meeting and opens a hole in the middle of the pie. Keep the point. */
    const r = Math.max(0, Math.min(cr, ro / 4));
    const offO = (r / ro) * DEG;
    const big = a1 - offO - (a0 + offO) > 180 ? 1 : 0;
    return [
      `M ${P(ro, a0 + offO)}`,
      `A ${ro} ${ro} 0 ${big} 1 ${P(ro, a1 - offO)}`,
      `A ${r} ${r} 0 0 1 ${P(ro - r, a1)}`,
      `L ${cx} ${cy}`,
      `L ${P(ro - r, a0)}`,
      `A ${r} ${r} 0 0 1 ${P(ro, a0 + offO)}`,
      'Z',
    ].join(' ');
  }

  const r = Math.max(0, Math.min(cr, (ro - ri) / 2, (ri * spanRad) / 2));
  const offO = (r / ro) * DEG;
  const offI = (r / ri) * DEG;
  const big = a1 - offO - (a0 + offO) > 180 ? 1 : 0;
  return [
    `M ${P(ro, a0 + offO)}`,
    `A ${ro} ${ro} 0 ${big} 1 ${P(ro, a1 - offO)}`,
    `A ${r} ${r} 0 0 1 ${P(ro - r, a1)}`,
    `L ${P(ri + r, a1)}`,
    `A ${r} ${r} 0 0 1 ${P(ri, a1 - offI)}`,
    `A ${ri} ${ri} 0 ${big} 0 ${P(ri, a0 + offI)}`,
    `A ${r} ${r} 0 0 1 ${P(ri + r, a0)}`,
    `L ${P(ro - r, a0)}`,
    `A ${r} ${r} 0 0 1 ${P(ro, a0 + offO)}`,
    'Z',
  ].join(' ');
}
