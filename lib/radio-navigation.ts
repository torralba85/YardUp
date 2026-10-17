/** Roving radio selection, including Home/End and wrapping arrow navigation. */
export function radioIndex(key:string,index:number,count:number):number|null {
  if(key==="Home") return 0;
  if(key==="End") return count-1;
  if(key==="ArrowDown"||key==="ArrowRight") return (index+1)%count;
  if(key==="ArrowUp"||key==="ArrowLeft") return (index+count-1)%count;
  return null;
}
