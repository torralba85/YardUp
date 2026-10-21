import * as THREE from "three";

export interface ExportOrthographicViewOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  lotWidth: number;
  lotLength: number;
}

/**
 * Renders an orthographic top-down site-plan view of the 3D scene and returns a PNG data URL.
 */
export async function exportOrthographicView({
  renderer,
  scene,
  lotWidth,
  lotLength,
}: ExportOrthographicViewOptions): Promise<string> {
  const margin = 1.2;
  const aspect = lotWidth / (lotLength || 1);
  const frustumSize = Math.max(lotWidth, lotLength) * margin;

  const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    1000,
  );

  // Position overhead looking straight down
  camera.position.set(0, 100, 0);
  camera.lookAt(0, 0, 0);
  camera.up.set(0, 0, -1);
  camera.updateProjectionMatrix();

  // Render to a separate off-screen canvas if available, or capture directly
  const originalRenderTarget = renderer.getRenderTarget();
  const width = Math.min(1024, Math.round(lotWidth * 10) || 512);
  const height = Math.min(1024, Math.round(lotLength * 10) || 512);

  const renderTarget = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    colorSpace: THREE.SRGBColorSpace,
  });

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(originalRenderTarget);

  // Read pixels into a 2D canvas to produce a clean PNG data URL
  const buffer = new Uint8Array(width * height * 4);
  renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);
  renderTarget.dispose();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return renderer.domElement.toDataURL("image/png");
  }

  const imageData = ctx.createImageData(width, height);
  // Flip vertically because WebGL texture coordinates are bottom-to-top
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const destIndex = ((height - 1 - y) * width + x) * 4;
      imageData.data[destIndex] = buffer[srcIndex];
      imageData.data[destIndex + 1] = buffer[srcIndex + 1];
      imageData.data[destIndex + 2] = buffer[srcIndex + 2];
      imageData.data[destIndex + 3] = buffer[srcIndex + 3];
    }
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}
