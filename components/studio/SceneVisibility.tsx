"use client";

import { useEffect, useMemo } from "react";
import { Line } from "@react-three/drei";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { SetbackEnvelope } from "@/components/canvas/SetbackEnvelope";
import { UtilityAnchorPoint } from "@/components/canvas/UtilityAnchorPoint";
import {
  nearestPointOnAdu,
  UtilityTrenchLine,
  utilityRunDistanceFt,
} from "@/components/canvas/UtilityTrenchLine";
import type { ADUConfig, Parcel } from "@/lib/feasibility";
import { buildSetbackEnvelope, type PlacementResult } from "@/lib/placement-validation";
import { aduSetbacks } from "@/lib/adu-setbacks";
import { buildExistingHouseSceneModel, rectangleCorners, type Pose2D } from "@/lib/scene-model";
import {
  registerSitePlanCapture,
  setUtilityAnchor,
  setUtilityEstimate,
  setUtilityParcelKey,
  useStudioEnhancements,
} from "@/lib/studio-enhancements-store";
import { exportOrthographicView } from "@/utils/canvas/exportOrthographicView";
import { COLOR } from "@/lib/design-tokens";


/**
 * Stops rendering when hidden and also hosts the lightweight client-side
 * setback/utility overlays. Keeping these tools inside the existing Canvas
 * means they share the Studio's coordinate system and never need a second 3D
 * renderer.
 */
export function SceneVisibility({
  utilityMode = false,
  parcel = null,
  config = null,
  pose = null,
  placement = null,
}: {
  utilityMode?: boolean;
  parcel?: Parcel | null;
  config?: ADUConfig | null;
  pose?: Pose2D | null;
  placement?: PlacementResult | null;
}) {
  const { gl, scene, setFrameloop, invalidate, get } = useThree();
  const { utilityAnchor } = useStudioEnhancements();
  const parcelKey = parcel ? `${parcel.address}|${parcel.city}` : null;

  useEffect(() => {
    setUtilityParcelKey(parcelKey);
  }, [parcelKey]);

  useEffect(() => {
    const previous = get().frameloop;
    let intersects = true;
    const update = () => {
      const visible = intersects && document.visibilityState !== "hidden";
      setFrameloop(visible ? "demand" : "never");
      if (visible) invalidate();
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            if (entries[0]) {
              intersects = entries[0].isIntersecting;
              update();
            }
          });
    observer?.observe(gl.domElement);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
      setFrameloop(previous);
    };
  }, [get, gl, invalidate, setFrameloop]);

  useEffect(() => {
    if (!parcel) {
      registerSitePlanCapture(null);
      return;
    }
    const capture = () =>
      exportOrthographicView({
        renderer: gl,
        scene,
        lotWidth: parcel.lotWidth,
        lotLength: parcel.lotLength,
      });
    registerSitePlanCapture(capture);
    return () => registerSitePlanCapture(null);
  }, [gl, parcel, scene]);

  const boundary = useMemo(() => {
    if (!parcel) return [];
    const halfWidth = parcel.lotWidth / 2;
    const halfLength = parcel.lotLength / 2;
    return [
      new THREE.Vector2(-halfWidth, -halfLength),
      new THREE.Vector2(halfWidth, -halfLength),
      new THREE.Vector2(halfWidth, halfLength),
      new THREE.Vector2(-halfWidth, halfLength),
    ];
  }, [parcel]);

  const innerBoundary = useMemo(() => {
    if (!parcel) return [];
    const envelope = buildSetbackEnvelope(parcel.lotWidth, parcel.lotLength, aduSetbacks(parcel, config));
    return envelope?.map((point) => new THREE.Vector2(point.x, point.z)) ?? [];
  }, [parcel, config]);

  const setbackViolated =
    placement?.envelopeStatus === "overflow" || placement?.envelopeStatus === "empty";
  const aduOutline = useMemo(() => {
    if (!config || !pose || !setbackViolated) return [];
    const corners = rectangleCorners(
      { x: pose.x, z: pose.z },
      config.width,
      config.length,
      pose.rotationDeg,
    );
    return [
      ...corners.map((point) => [point.x, 0.32, point.z] as [number, number, number]),
      [corners[0].x, 0.32, corners[0].z] as [number, number, number],
    ];
  }, [config, pose, setbackViolated]);

  const house = useMemo(
    () => (parcel ? buildExistingHouseSceneModel(parcel) : null),
    [parcel],
  );

  const utilityEnd = useMemo(() => {
    if (!utilityAnchor || !config || !pose) return null;
    return nearestPointOnAdu(utilityAnchor, config, pose);
  }, [config, pose, utilityAnchor]);

  useEffect(() => {
    if (!utilityAnchor || !utilityEnd) {
      setUtilityEstimate(null);
      return;
    }
    const distanceFt = utilityRunDistanceFt(utilityAnchor, utilityEnd);
    setUtilityEstimate({
      distanceFt,
      lowCost: Math.round(distanceFt * 65),
      highCost: Math.round(distanceFt * 120),
    });
  }, [utilityAnchor, utilityEnd]);

  const handleHousePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setUtilityAnchor({ x: event.point.x, y: 0.3, z: event.point.z });
    invalidate();
  };

  return (
    <>
      {parcel && boundary.length >= 3 && innerBoundary.length >= 3 && (
        <SetbackEnvelope
          boundary={boundary}
          innerBoundary={innerBoundary}
          violated={setbackViolated}
        />
      )}

      {aduOutline.length > 0 && (
        <Line points={aduOutline} color={COLOR["status-blocked"]} lineWidth={3} />
      )}

      {utilityMode && house?.pose && house.footprint.width && house.footprint.depth && (
        <mesh
          name="lf-export-hide-utility-picker"
          position={[house.pose.x, 4.5, house.pose.z]}
          onPointerDown={handleHousePointerDown}
        >
          <boxGeometry args={[house.footprint.width, 9, house.footprint.depth]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {utilityAnchor && <UtilityAnchorPoint point={utilityAnchor} />}
      {utilityAnchor && config && pose && (
        <UtilityTrenchLine start={utilityAnchor} config={config} pose={pose} />
      )}
    </>
  );
}
