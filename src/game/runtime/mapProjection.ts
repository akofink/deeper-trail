export function projectMapPoint(
  x: number,
  y: number,
  z: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
  w: number,
  h: number,
  margin: number,
  rotation: number
): {
  x: number;
  y: number;
  depth: number;
} {
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cy = (bounds.minY + bounds.maxY) * 0.5;
  const cz = (bounds.minZ + bounds.maxZ) * 0.5;
  const dx = x - cx;
  const dy = y - cy;
  const dz = z - cz;

  const cosYaw = Math.cos(rotation);
  const sinYaw = Math.sin(rotation);
  const yawX = dx * cosYaw - dz * sinYaw;
  const yawZ = dx * sinYaw + dz * cosYaw;

  const pitch = -0.42;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const pitchY = dy * cosPitch - yawZ * sinPitch;
  const depth = dy * sinPitch + yawZ * cosPitch;

  const xSpan = Math.max(1, bounds.maxX - bounds.minX);
  const ySpan = Math.max(1, bounds.maxY - bounds.minY);
  const zSpan = Math.max(1, bounds.maxZ - bounds.minZ);
  const horizontalScale = ((w - margin * 2) / Math.max(xSpan, zSpan)) * 0.78;
  const verticalScale = ((h - margin * 2) / Math.max(ySpan, zSpan * 0.82)) * 0.72;
  const perspective = 1 + depth / Math.max(900, zSpan * 3.2);

  return {
    x: w * 0.5 + yawX * horizontalScale * perspective,
    y: h * 0.5 + pitchY * verticalScale * perspective,
    depth
  };
}
