import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Ray, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useSceneDrag } from "./use-scene-drag";
const pose={x:0,z:0,rotationDeg:90};
function event(x=10,z=10,id=1) {
  return {button:0,pointerId:id,ray:new Ray(new Vector3(x,10,z),new Vector3(0,-1,0)),stopPropagation:vi.fn(),
    target:{setPointerCapture:vi.fn(),releasePointerCapture:vi.fn()}} as unknown as ThreeEvent<PointerEvent>;
}
describe("drag interruption and commits", () => {
  it.each(["Escape","pointercancel","lostpointercapture","unmount"])("restores initial pose and controls on %s", (interruption) => {
    const controls={enabled:true},onPreview=vi.fn(),onCommit=vi.fn();
    const hook=renderHook(()=>useSceneDrag({pose,controls,onPreview,onCommit})); const down=event();
    act(()=>hook.result.current.onPointerDown(down));
    act(()=>hook.result.current.onPointerMove(event(15,12)));
    expect(onPreview).toHaveBeenLastCalledWith({x:5,z:2,rotationDeg:90});
    expect(controls.enabled).toBe(false);
    act(()=>{
      if(interruption==="unmount") hook.unmount();
      else if(interruption==="Escape") window.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape"}));
      else window.dispatchEvent(Object.assign(new Event(interruption),{pointerId:1}));
    });
    expect(controls.enabled).toBe(true); expect((down.target as unknown as {releasePointerCapture: ReturnType<typeof vi.fn>}).releasePointerCapture).toHaveBeenCalledWith(1);
    expect(onPreview).toHaveBeenLastCalledWith(pose); expect(onCommit).not.toHaveBeenCalled();
  });
  it("does not jump on grab, ignores other pointers, survives rerenders, commits once and preserves disabled controls", () => {
    const controls={enabled:false},onPreview=vi.fn(),onCommit=vi.fn();
    const hook=renderHook(({callback})=>useSceneDrag({pose,controls,onPreview:callback,onCommit}),{initialProps:{callback:onPreview}});
    act(()=>hook.result.current.onPointerDown(event()));
    act(()=>hook.result.current.onPointerMove(event())); expect(onPreview).toHaveBeenLastCalledWith(pose);
    const replacement=vi.fn(); hook.rerender({callback:replacement});
    act(()=>hook.result.current.onPointerMove(event(100,100,2))); expect(replacement).not.toHaveBeenCalled();
    act(()=>hook.result.current.onPointerMove(event(15,12)));
    act(()=>hook.result.current.onPointerUp(event(15,12)));
    act(()=>window.dispatchEvent(Object.assign(new Event("pointerup"),{pointerId:1})));
    expect(onCommit).toHaveBeenCalledExactlyOnceWith({x:5,z:2,rotationDeg:90}); expect(controls.enabled).toBe(false);
  });
});
