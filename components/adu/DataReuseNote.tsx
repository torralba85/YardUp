/** Licence for LotFoundry's published data tables. Andrew chose CC BY 4.0 on 2026-10-28. */
export const DATA_LICENSE = {
  name: "CC BY 4.0",
  url: "https://creativecommons.org/licenses/by/4.0/",
} as const;

/** The reuse line shown beside every CSV download, worded once for both data pages. */
export function DataReuseNote() {
  return (
    <>
      Free to reuse under{" "}
      <a href={DATA_LICENSE.url} rel="license noopener" className="underline underline-offset-2 hover:text-lot-ink">
        {DATA_LICENSE.name}
      </a>{" "}
      with a link to this page.
    </>
  );
}
