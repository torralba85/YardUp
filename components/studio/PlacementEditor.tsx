"use client";
import { Button } from "@/components/ui/Button";
import { NumericField } from "./NumericField";
import type { Pose2D } from "@/lib/scene-model";
import type { ADUConfig } from "@/lib/feasibility";
import { buildAduHeightModel } from "@/lib/scene-model";
export function PlacementEditor({config,pose,onChange}: {config:ADUConfig;pose:Pose2D;onChange(pose:Pose2D):void}) {
  const total=buildAduHeightModel(config)?.totalHeight;
  return <details className="border-t border-[#DADAD3] bg-[#F5F5F0] px-3">
    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[#161616]">Move or rotate ADU</summary>
    <p className="mb-3 text-xs text-[#65655F]">Selected: {config.width} × {config.length} ft ADU · {config.height} ft walls · {total?.toFixed(1)} ft total height. Position uses modeled lot coordinates; +Z is the front.</p>
    <div className="grid grid-cols-3 gap-2">
      <NumericField label="X position (ft)" value={pose.x} min={-10000} max={10000} onChange={x=>onChange({...pose,x})}/>
      <NumericField label="Z position (ft)" value={pose.z} min={-10000} max={10000} onChange={z=>onChange({...pose,z})}/>
      <NumericField label="Rotation (degrees)" value={pose.rotationDeg} min={0} max={359.9} step={1} onChange={rotationDeg=>onChange({...pose,rotationDeg})}/>
    </div>
    <div role="group" aria-label="Nudge ADU one foot" className="my-3 flex flex-wrap gap-1">
      {[{label:"Left 1 ft",x:-1,z:0},{label:"Right 1 ft",x:1,z:0},{label:"Rear 1 ft",x:0,z:-1},{label:"Front 1 ft",x:0,z:1}].map(move=><Button key={move.label} variant="secondary" size="sm" className="min-h-11" onClick={()=>onChange({...pose,x:pose.x+move.x,z:pose.z+move.z})}>{move.label}</Button>)}
      <Button variant="secondary" size="sm" className="min-h-11" onClick={()=>onChange({...pose,rotationDeg:(pose.rotationDeg+90)%360})}>Rotate 90°</Button>
    </div>
  </details>;
}
