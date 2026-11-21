"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Matrix4, Vector3, type Camera } from "three";
import { isValidSplatTransform, MAX_WORKBENCH_SPLATS, type SplatSource, type SplatTransform } from "@/lib/splat-scene";

export type SplatLayerStatus =
  | { state: "loading" }
  | { state: "ready"; splats: number; loadMs: number }
  | { state: "error"; message: string };

interface Props {
  source: SplatSource;
  transform: SplatTransform;
  onStatus: (status: SplatLayerStatus) => void;
}

/** Owns Spark; R3F retains the only canvas, camera, render loop and input system. */
export default function GaussianSplatLayer({ source, transform, onStatus }: Props) {
  const { gl, scene, invalidate } = useThree();
  const group = useRef<Group | null>(null);
  const tick = useRef<((camera: Camera) => void) | null>(null);
  const currentTransform = useRef(transform);

  useEffect(() => {
    currentTransform.current = transform;
    if (group.current && isValidSplatTransform(transform)) {
      group.current.position.fromArray(transform.positionFt);
      group.current.rotation.y = transform.yawRad;
      group.current.scale.setScalar(transform.uniformScale);
      invalidate();
    }
  }, [transform, invalidate]);

  useFrame(({ camera }) => tick.current?.(camera));

  useEffect(() => {
    let released = false;
    let failed = false;
    let pendingUpdate: Promise<void> | null = null;
    let mesh: import("@sparkjsdev/spark").SplatMesh | undefined;
    let spark: import("@sparkjsdev/spark").SparkRenderer | undefined;
    let ownTick: ((camera: Camera) => void) | null = null;
    let hasUpdated = false;
    const lastCamera = new Matrix4();
    const lastProjection = new Matrix4();
    const lastTransform = new Matrix4();
    const container = new Group();
    const started = performance.now();

    function detach() {
      scene.remove(container);
      if (spark) scene.remove(spark);
      if (group.current === container) group.current = null;
      if (tick.current === ownTick) tick.current = null;
    }

    function dispose() {
      mesh?.dispose();
      spark?.dispose();
      // Spark 2.2 disposes its accumulators/workers but not the Mesh's own
      // geometry/material. These belong to this adapter, not the shared canvas.
      spark?.geometry.dispose();
      spark?.material.dispose();
      mesh = undefined;
      spark = undefined;
      container.clear();
    }

    onStatus({ state: "loading" });
    void (async () => {
      try {
        const { SplatMesh, SparkRenderer } = await import("@sparkjsdev/spark");
        if (released) return;
        const meshOptions: import("@sparkjsdev/spark").SplatMeshOptions = {
          fileName: source.fileName,
          nonLod: true,
          enableLod: false,
          raycastable: false,
        };
        if (source.bytes) {
          meshOptions.fileBytes = source.bytes.slice();
        } else if (source.url) {
          meshOptions.url = source.url;
        } else {
          throw new Error("Scan data or URL missing.");
        }
        mesh = new SplatMesh(meshOptions);
        await mesh.initialized;
        if (released) { dispose(); return; }
        if (!mesh.numSplats) throw new Error("The scan contains no splats.");
        if (mesh.numSplats > MAX_WORKBENCH_SPLATS) throw new Error("This workbench supports up to 100,000 splats. Open a reduced scan for inspection.");
        if (source.normalizeForInspection) {
          const bounds = mesh.getBoundingBox();
          const size = bounds.getSize(new Vector3());
          const extent = Math.max(size.x, size.y, size.z);
          if (!Number.isFinite(extent) || extent <= 0) throw new Error("The scan has invalid bounds.");
          const center = bounds.getCenter(new Vector3());
          const scale = 30 / extent;
          mesh.scale.setScalar(scale);
          mesh.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        }
        const registration = currentTransform.current;
        if (!isValidSplatTransform(registration)) throw new Error("Invalid visual calibration.");
        container.position.fromArray(registration.positionFt);
        container.rotation.y = registration.yawRad;
        container.scale.setScalar(registration.uniformScale);
        container.add(mesh);
        spark = new SparkRenderer({ renderer: gl, autoUpdate: false, enableLod: false,
          enableDriveLod: false, minSortIntervalMs: 0, depthTest: true, depthWrite: false,
          onDirty: () => { if (!released && !failed) invalidate(); } });
        scene.add(spark, container);
        group.current = container;
        ownTick = (camera) => {
          if (released || failed || pendingUpdate || !spark) return;
          camera.updateWorldMatrix(true, false);
          container.updateWorldMatrix(true, false);
          // Manual Spark updates force regeneration. A sorting-completion redraw
          // must not start another sort of the same static scene forever.
          if (hasUpdated && lastCamera.equals(camera.matrixWorld)
            && lastProjection.equals(camera.projectionMatrix)
            && lastTransform.equals(container.matrixWorld)) return;
          hasUpdated = true;
          lastCamera.copy(camera.matrixWorld);
          lastProjection.copy(camera.projectionMatrix);
          lastTransform.copy(container.matrixWorld);
          // Serialize updates so teardown can await the outstanding GPU readback
          // and worker sort before releasing resources. onDirty schedules redraw.
          pendingUpdate = spark.update({ scene, camera }).catch((error: unknown) => {
            failed = true;
            detach();
            if (!released) onStatus({ state: "error", message: error instanceof Error ? error.message : "Scan rendering failed. Reload the scan or continue with the 3D model." });
          }).finally(() => {
            pendingUpdate = null;
            if (failed) dispose();
            // Also catch camera/calibration changes made during the pending sort.
            else if (!released) invalidate();
          });
        };
        tick.current = ownTick;
        onStatus({ state: "ready", splats: mesh.numSplats, loadMs: performance.now() - started });
        invalidate();
      } catch (error) {
        detach();
        dispose();
        if (!released) onStatus({ state: "error", message: error instanceof Error ? error.message : "Could not decode this scan. Try another scan file or continue with the 3D model." });
      }
    })();

    return () => {
      released = true;
      detach();
      // A decoder still initializing owns its resources until its await resumes.
      // An attached renderer may still be sorting: never terminate it mid-RPC.
      if (spark) void Promise.resolve(pendingUpdate).then(dispose);
      invalidate();
    };
  }, [source, gl, scene, invalidate, onStatus]);

  return null;
}
