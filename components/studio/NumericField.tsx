"use client";
import { useId, useState } from "react";
/** Keep incomplete typing local; commit a finite bounded value on blur or Enter. */
export function NumericField({label,value,min,max,step=0.5,onChange}: {
  label:string;value:number;min:number;max:number;step?:number;onChange(value:number):void;
}) {
  const id=useId();
  const [previous,setPrevious]=useState(value),[draft,setDraft]=useState(String(value));
  if(previous!==value) { setPrevious(value); setDraft(String(value)); }
  function commit() {
    const parsed=Number(draft);
    if(draft.trim() && Number.isFinite(parsed)) {
      const next=Math.min(max,Math.max(min,parsed)); setDraft(String(next)); if(next!==value) onChange(next);
    } else setDraft(String(value));
  }
  return <label htmlFor={id} className="block min-w-0 text-xs font-medium text-[#65655F]">
    {label}
    <input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={draft}
      onChange={event=>setDraft(event.target.value)} onBlur={commit}
      onKeyDown={event=>{ if(event.key==="Enter") event.currentTarget.blur(); if(event.key==="Escape") { setDraft(String(value)); event.currentTarget.blur(); } }}
      className="mt-1 h-11 w-full min-w-0 rounded-[3px] border border-lot-stone bg-lf-card px-2.5 font-sans text-base sm:text-sm tabular-nums text-[#161616] motion-safe:transition-colors hover:border-[#B7B7AE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#161616] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F5F0]" />
  </label>;
}
