import { notFound } from "next/navigation";
import SplatWorkbench from "@/components/studio/SplatWorkbench";

export const metadata = { title: "3D scan workbench", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function SplatWorkbenchPage() {
  if (process.env.STUDIO_SPLAT_BETA !== "true") notFound();
  return <SplatWorkbench />;
}
