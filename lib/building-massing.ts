import { ExtrudeGeometry, Shape } from "three";
import type { LocalPoint } from "./scene-model";

/** Extrude the observed footprint in feet, without stretching it to its bounds. */
export function buildBuildingMassing(points: LocalPoint[], heightFt: number): ExtrudeGeometry {
  const shape = new Shape();
  points.forEach((point, index) => {
    // Rotation below maps shape -y to scene z and extrusion z to scene y.
    if (index === 0) shape.moveTo(point.x, -point.z);
    else shape.lineTo(point.x, -point.z);
  });
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: heightFt, bevelEnabled: false, steps: 1 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}
