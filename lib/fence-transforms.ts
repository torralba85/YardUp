import { Object3D } from "three";
/** One shared cube and material per segment. Horizontal schematic fences only. */
export function computeFenceTransforms(start: [number,number,number], end: [number,number,number], spacing=8, height=3) {
  const empty=()=>({matrices:new Float32Array(0),count:0});
  if (![...start,...end,spacing,height].every(Number.isFinite) || spacing<=0 || height<=0 || start[1]!==end[1]) return empty();
  const dx=end[0]-start[0],dz=end[2]-start[2],length=Math.hypot(dx,dz);
  if(length<0.001 || length/spacing>10000) return empty();
  // Equal intervals guarantee both endpoints and never exceed requested spacing.
  const intervals=Math.ceil(length/spacing), count=intervals+3;
  const matrices=new Float32Array(count*16), object=new Object3D();
  for(let i=0;i<=intervals;i++) {
    object.position.set(start[0]+dx*i/intervals,start[1]+height/2,start[2]+dz*i/intervals);
    object.scale.set(.3,height,.3); object.rotation.set(0,0,0); object.updateMatrix(); object.matrix.toArray(matrices,i*16);
  }
  [.52,.86].forEach((fraction,i)=>{
    object.position.set((start[0]+end[0])/2,start[1]+height*fraction,(start[2]+end[2])/2);
    object.scale.set(.12,.28,length); object.rotation.set(0,Math.atan2(dx,dz),0);
    object.updateMatrix(); object.matrix.toArray(matrices,(intervals+1+i)*16);
  });
  return {matrices,count};
}
