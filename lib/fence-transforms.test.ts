import { describe, expect, it } from "vitest";
import { Matrix4, Quaternion, Vector3 } from "three";
import { computeFenceTransforms } from "./fence-transforms";
describe("instanced fence",()=>{
  it.each([16,20,125])("includes both endpoints for a %s foot segment and keeps rails aligned",length=>{
    const {matrices,count}=computeFenceTransforms([2,0,3],[2+length,0,3],8,3);
    const intervals=Math.ceil(length/8);
    const position=new Vector3(),scale=new Vector3(),rotation=new Quaternion();
    new Matrix4().fromArray(matrices,intervals*16).decompose(position,rotation,scale);
    expect(position.toArray()).toEqual([2+length,1.5,3]); expect(count).toBe(intervals+3);
    new Matrix4().fromArray(matrices,(count-1)*16).decompose(position,rotation,scale);
    expect(position.x).toBeCloseTo(2+length/2); expect(scale.z).toBeCloseTo(length);
    expect(new Vector3(0,0,1).applyQuaternion(rotation).x).toBeCloseTo(1);
  });
  it("does not allocate broken or unbounded geometry",()=>{
    for(const value of [NaN,Infinity,-1,0]) expect(computeFenceTransforms([0,0,0],[20,0,0],value).count).toBe(0);
    expect(computeFenceTransforms([0,0,0],[0,0,0]).count).toBe(0);
    expect(computeFenceTransforms([0,0,0],[Infinity,0,0]).count).toBe(0);
  });
});
