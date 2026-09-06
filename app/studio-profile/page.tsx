import { notFound } from "next/navigation";
import StudioProfile from "@/components/studio/StudioProfile";

export const metadata = { title: "Local Studio profiling", robots: { index: false, follow: false } };

export default function StudioProfilePage() {
  if (process.env.NEXT_PUBLIC_PROFILE_STUDIO !== "true") notFound();
  return <StudioProfile />;
}
