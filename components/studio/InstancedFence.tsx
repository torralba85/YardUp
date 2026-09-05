"use client";
import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, DynamicDrawUsage } from "three";
import { computeFenceTransforms } from "@/lib/fence-transforms";

export function InstancedFence({start,end,postSpacing=8,postHeight=3}: {
  start:[number,number,number];end:[number,number,number];postSpacing?:number;postHeight?:number;
}) {
  const mesh=useRef<InstancedMesh>(null);
  const [sx,sy,sz]=start,[ex,ey,ez]=end;
  const {matrices,count}=useMemo(()=>computeFenceTransforms([sx,sy,sz],[ex,ey,ez],postSpacing,postHeight),[sx,sy,sz,ex,ey,ez,postSpacing,postHeight]);
  useLayoutEffect(()=>{
    if(!mesh.current) return;
    mesh.current.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.current.instanceMatrix.array.set(matrices); mesh.current.instanceMatrix.needsUpdate=true;
    mesh.current.computeBoundingSphere();
  },[matrices,count]);
  if(!count) return null;
  return <instancedMesh ref={mesh} args={[undefined,undefined,count]} castShadow receiveShadow>
    <boxGeometry args={[1,1,1]} />
    <meshStandardMaterial color="#8a7e6e" roughness={.88} />
  </instancedMesh>;
}
