"use client";

import { useEffect, useState } from "react";

/** Links to the sections actually rendered for this jurisdiction. */
export function GuideIndex() {
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    const headings = document.querySelectorAll<HTMLHeadingElement>("#guide-content h2[id]");
    // The page sections are server-rendered and can vary by local data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSections(Array.from(headings, heading => ({ id: heading.id, title: heading.textContent.trim() })));
  }, []);
  if (sections.length < 4) return null;
  return (
    <nav aria-label="On this page" className="border-y border-lot-line">
      <details>
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">On this page</summary>
        <ul className="pb-3">{sections.map(({ id, title }) => (
          <li key={id}><a href={`#${id}`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">{title}</a></li>
        ))}</ul>
      </details>
    </nav>
  );
}
