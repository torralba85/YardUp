import { describe, expect, it } from "vitest";
import { OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { boundsCorners, calculateCameraFit } from "./scene-camera-fit";

describe("camera projection acceptance", () => {
  for (const [width, depth, height] of [[10,15,6],[40,125,15],[200,35,30],[35,300,12],[20,20,60]]) {
    for (const [W,H] of [[320,480],[390,360],[768,460],[1440,900]]) {
      it(`contains all corners for ${width}x${depth}x${height} at ${W}x${H}`, () => {
        const bounds = {minX:-width/2,maxX:width/2,minZ:-depth/2,maxZ:depth/2,minY:0,maxY:height};
        for (const mode of ["overview","setbacks"] as const) for (const insets of [
          {top:8,right:8,bottom:8,left:8}, {top:H*.1,right:W*.1,bottom:H*.1,left:W*.1},
          {top:12,right:W*.3,bottom:H*.15,left:5},
        ]) {
          const fit = calculateCameraFit({bounds,fov:42,viewportWidth:W,viewportHeight:H,insets,mode})!;
          const camera = fit.isOrthographic ? new OrthographicCamera(-W/2,W/2,H/2,-H/2,fit.near,fit.far) : new PerspectiveCamera(42,W/H,fit.near,fit.far);
          camera.zoom=fit.zoom; camera.up.fromArray(mode === "setbacks" ? [0,0,-1] : [0,1,0]);
          camera.position.fromArray(fit.position); camera.lookAt(new Vector3().fromArray(fit.target));
          camera.updateMatrixWorld(); camera.updateProjectionMatrix();
          for (const corner of boundsCorners(bounds)) {
            const point=corner.project(camera); const x=(point.x+1)*W/2,y=(1-point.y)*H/2;
            expect(x).toBeGreaterThan(insets.left); expect(x).toBeLessThan(W-insets.right);
            expect(y).toBeGreaterThan(insets.top); expect(y).toBeLessThan(H-insets.bottom);
            expect(point.z).toBeGreaterThan(-1); expect(point.z).toBeLessThan(1);
          }
          if (mode === "setbacks") expect(camera.position.x).toBeCloseTo(fit.target[0]);
        }
      });
    }
  }
  it("rejects invalid frusta and dimensions", () => {
    const base={bounds:{minX:0,maxX:1,minY:0,maxY:1,minZ:0,maxZ:1},viewportWidth:320,viewportHeight:400,fov:42,mode:"overview" as const,insets:{top:0,right:0,bottom:0,left:0}};
    expect(calculateCameraFit({...base,fov:NaN})).toBeNull();
    expect(calculateCameraFit({...base,insets:{...base.insets,left:321}})).toBeNull();
    expect(calculateCameraFit({...base,bounds:{...base.bounds,maxY:Infinity}})).toBeNull();
  });
});
