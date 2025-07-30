export type Mat = [number, number, number, number, number, number];

export const I: Mat = [1, 0, 0, 1, 0, 0];

export function mul(m: Mat, n: Mat): Mat {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export function translate(tx: number, ty: number): Mat {
  return [1, 0, 0, 1, tx, ty];
}

export function scale(sx: number, sy: number): Mat {
  return [sx, 0, 0, sy, 0, 0];
}

export function rotate(rad: number): Mat {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, s, -s, c, 0, 0];
}

export function around(pivot: [number, number], op: Mat): Mat {
  return mul(
    mul(translate(pivot[0], pivot[1]), op),
    translate(-pivot[0], -pivot[1]),
  );
}

export function snap(v: number, eps = 0.01): number {
  const snaps = [0, 0.5, 1];
  for (const s of snaps) {
    if (Math.abs(v - s) < eps) return s;
  }
  return v;
}

export function toCssMatrix(m: Mat, w: number, h: number): string {
  const S: Mat = [w, 0, 0, h, 0, 0];
  const Si: Mat = [1 / w, 0, 0, 1 / h, 0, 0];
  const r = mul(mul(S, m), Si);
  return `matrix(${r.join(",")})`;
}
