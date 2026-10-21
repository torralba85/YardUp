import { COLOR } from "@/lib/design-tokens";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import { buildExistingHouseSceneModel, rectangleCorners, type Pose2D } from "@/lib/scene-model";
import { getScenePlacement } from "@/lib/site-fit";
import { SITE_PLAN_EXPORT_PX, SITE_PLAN_MARGIN_FT } from "./exportOrthographicView";

export interface SitePlanAnnotationInput {
  parcel: Parcel;
  config: ADUConfig;
  pose: Pose2D;
  snapshotDataUrl?: string | null;
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load site plan image."));
    image.src = source;
  });
}

function dimensionLine(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  const cap = 8;
  if (Math.abs(x2 - x1) >= Math.abs(y2 - y1)) {
    context.beginPath();
    context.moveTo(x1, y1 - cap);
    context.lineTo(x1, y1 + cap);
    context.moveTo(x2, y2 - cap);
    context.lineTo(x2, y2 + cap);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(x1 - cap, y1);
    context.lineTo(x1 + cap, y1);
    context.moveTo(x2 - cap, y2);
    context.lineTo(x2 + cap, y2);
    context.stroke();
  }
}

function drawFallbackPlan(
  context: CanvasRenderingContext2D,
  parcel: Parcel,
  config: ADUConfig,
  pose: Pose2D,
  toCanvas: (x: number, z: number) => { x: number; y: number },
) {
  const lotA = toCanvas(-parcel.lotWidth / 2, -parcel.lotLength / 2);
  const lotB = toCanvas(parcel.lotWidth / 2, parcel.lotLength / 2);
  context.fillStyle = COLOR["lot-surface"];
  context.fillRect(lotA.x, lotA.y, lotB.x - lotA.x, lotB.y - lotA.y);
  context.strokeStyle = COLOR["lot-ink"];
  context.lineWidth = 4;
  context.strokeRect(lotA.x, lotA.y, lotB.x - lotA.x, lotB.y - lotA.y);

  const setbackA = toCanvas(
    -parcel.lotWidth / 2 + parcel.setbacks.side,
    -parcel.lotLength / 2 + parcel.setbacks.rear,
  );
  const setbackB = toCanvas(
    parcel.lotWidth / 2 - parcel.setbacks.side,
    parcel.lotLength / 2 - parcel.setbacks.front,
  );
  context.save();
  context.setLineDash([14, 10]);
  context.strokeStyle = COLOR["lot-stone"];
  context.lineWidth = 3;
  context.strokeRect(setbackA.x, setbackA.y, setbackB.x - setbackA.x, setbackB.y - setbackA.y);
  context.restore();

  const house = buildExistingHouseSceneModel(parcel);
  if (house.corners) {
    const points = house.corners.map((point) => toCanvas(point.x, point.z));
    context.fillStyle = COLOR["lot-line"];
    context.strokeStyle = COLOR["lot-ink"];
    context.lineWidth = 3;
    context.beginPath();
    points.forEach((point, index) => {
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fill();
    context.stroke();
  }

  const aduPoints = rectangleCorners(
    { x: pose.x, z: pose.z },
    config.width,
    config.length,
    pose.rotationDeg,
  ).map((point) => toCanvas(point.x, point.z));
  context.fillStyle = COLOR["lot-orange"];
  context.strokeStyle = COLOR["lot-ink"];
  context.lineWidth = 3;
  context.beginPath();
  aduPoints.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.fill();
  context.stroke();
}

/** Add lot, ADU, separation, and setback dimensions to a top-down site plan. */
export async function drawSiteDimensions({
  parcel,
  config,
  pose,
  snapshotDataUrl,
}: SitePlanAnnotationInput): Promise<HTMLCanvasElement> {
  const extentWidth = parcel.lotWidth + SITE_PLAN_MARGIN_FT * 2;
  const extentLength = parcel.lotLength + SITE_PLAN_MARGIN_FT * 2;
  const aspect = extentWidth / extentLength;
  const width = aspect >= 1 ? SITE_PLAN_EXPORT_PX : Math.max(1, Math.round(SITE_PLAN_EXPORT_PX * aspect));
  const height = aspect >= 1 ? Math.max(1, Math.round(SITE_PLAN_EXPORT_PX / aspect)) : SITE_PLAN_EXPORT_PX;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable for site plan annotation.");

  context.fillStyle = COLOR["lot-chalk"];
  context.fillRect(0, 0, width, height);
  if (snapshotDataUrl) {
    const image = await loadImage(snapshotDataUrl);
    context.drawImage(image, 0, 0, width, height);
  }

  const toCanvas = (x: number, z: number) => ({
    x: ((x + extentWidth / 2) / extentWidth) * width,
    y: ((z + extentLength / 2) / extentLength) * height,
  });
  if (!snapshotDataUrl) drawFallbackPlan(context, parcel, config, pose, toCanvas);

  context.save();
  context.strokeStyle = COLOR["lot-ink"];
  context.fillStyle = COLOR["lot-ink"];
  context.lineWidth = 3;
  context.font = "600 24px Manrope, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const widthA = toCanvas(-parcel.lotWidth / 2, parcel.lotLength / 2 + 5);
  const widthB = toCanvas(parcel.lotWidth / 2, parcel.lotLength / 2 + 5);
  dimensionLine(context, widthA.x, widthA.y, widthB.x, widthB.y);
  context.fillText(`${parcel.lotWidth.toFixed(0)} ft lot width`, (widthA.x + widthB.x) / 2, widthA.y - 20);

  const depthA = toCanvas(-parcel.lotWidth / 2 - 5, -parcel.lotLength / 2);
  const depthB = toCanvas(-parcel.lotWidth / 2 - 5, parcel.lotLength / 2);
  dimensionLine(context, depthA.x, depthA.y, depthB.x, depthB.y);
  context.save();
  context.translate(depthA.x - 24, (depthA.y + depthB.y) / 2);
  context.rotate(-Math.PI / 2);
  context.fillText(`${parcel.lotLength.toFixed(0)} ft lot depth`, 0, 0);
  context.restore();

  const aduCenter = toCanvas(pose.x, pose.z);
  context.fillText(`${config.width} x ${config.length} ft ADU`, aduCenter.x, aduCenter.y);
  context.font = "600 20px Manrope, Arial, sans-serif";
  context.textAlign = "left";
  const setbackLabel = toCanvas(
    -parcel.lotWidth / 2 + parcel.setbacks.side,
    -parcel.lotLength / 2 + parcel.setbacks.rear,
  );
  context.fillText(
    `${parcel.setbacks.side} ft side / ${parcel.setbacks.rear} ft rear setback`,
    setbackLabel.x + 10,
    setbackLabel.y + 22,
  );

  const placement = getScenePlacement(parcel, config, pose);
  if (placement.houseClearanceFt !== null) {
    context.fillText(
      `Building separation: ${Math.max(placement.houseClearanceFt, 0).toFixed(1)} ft modeled`,
      aduCenter.x + 18,
      aduCenter.y + 34,
    );
  }

  context.font = "700 22px Manrope, Arial, sans-serif";
  context.textAlign = "right";
  context.fillText("N", width - 34, 34);
  context.beginPath();
  context.moveTo(width - 34, 48);
  context.lineTo(width - 34, 88);
  context.lineTo(width - 42, 74);
  context.moveTo(width - 34, 88);
  context.lineTo(width - 26, 74);
  context.stroke();
  context.restore();

  return canvas;
}
