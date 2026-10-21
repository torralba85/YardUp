import * as THREE from "three";

export const SITE_PLAN_MARGIN_FT = 12;
export const SITE_PLAN_EXPORT_PX = 1400;

/**
 * Capture the live R3F scene through a temporary top-down orthographic camera
 * without resizing or disturbing the visible canvas.
 */
export async function exportOrthographicView({
  renderer,
  scene,
  lotWidth,
  lotLength,
  sizePx = SITE_PLAN_EXPORT_PX,
  marginFt = SITE_PLAN_MARGIN_FT,
}: {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  lotWidth: number;
  lotLength: number;
  sizePx?: number;
  marginFt?: number;
}): Promise<string> {
  const width = Math.max(lotWidth + marginFt * 2, 1);
  const length = Math.max(lotLength + marginFt * 2, 1);
  const aspect = width / length;
  const renderWidth = aspect >= 1 ? sizePx : Math.max(1, Math.round(sizePx * aspect));
  const renderHeight = aspect >= 1 ? Math.max(1, Math.round(sizePx / aspect)) : sizePx;

  const camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    length / 2,
    -length / 2,
    0.1,
    1000,
  );
  camera.position.set(0, 250, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();

  const target = new THREE.WebGLRenderTarget(renderWidth, renderHeight, {
    depthBuffer: true,
    stencilBuffer: false,
  });
  target.texture.colorSpace = renderer.outputColorSpace;

  const previousTarget = renderer.getRenderTarget();
  const hidden: THREE.Object3D[] = [];
  scene.traverse((object) => {
    if (object.visible && object.name.startsWith("lf-export-hide")) {
      object.visible = false;
      hidden.push(object);
    }
  });

  const pixels = new Uint8Array(renderWidth * renderHeight * 4);
  try {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, renderWidth, renderHeight, pixels);
  } finally {
    renderer.setRenderTarget(previousTarget);
    hidden.forEach((object) => {
      object.visible = true;
    });
    target.dispose();
  }

  const canvas = document.createElement("canvas");
  canvas.width = renderWidth;
  canvas.height = renderHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable for site-plan export.");

  const flipped = new Uint8ClampedArray(pixels.length);
  const rowBytes = renderWidth * 4;
  for (let y = 0; y < renderHeight; y += 1) {
    const source = (renderHeight - 1 - y) * rowBytes;
    flipped.set(pixels.subarray(source, source + rowBytes), y * rowBytes);
  }
  context.putImageData(new ImageData(flipped, renderWidth, renderHeight), 0, 0);
  return canvas.toDataURL("image/png");
}
