"use client";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/** Gemini extraction, corrected to combine viewport and document visibility. */
export function SceneVisibility() {
  const {gl,setFrameloop,invalidate,get}=useThree();
  useEffect(()=>{
    const previous=get().frameloop;
    let intersects=true;
    const update=()=>{
      const visible=intersects && document.visibilityState!=="hidden";
      setFrameloop(visible?"demand":"never");
      if(visible) invalidate();
    };
    const observer=typeof IntersectionObserver==="undefined" ? null : new IntersectionObserver(entries=>{
      if(entries[0]) { intersects=entries[0].isIntersecting; update(); }
    });
    observer?.observe(gl.domElement);
    document.addEventListener("visibilitychange",update); update();
    return ()=>{ observer?.disconnect(); document.removeEventListener("visibilitychange",update); setFrameloop(previous); };
  },[gl,setFrameloop,invalidate,get]);
  return null;
}
