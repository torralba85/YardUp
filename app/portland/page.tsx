import { CityLandingPage, cityLandingMetadata } from "@/components/landing/lot-more/CityLandingPage";

export const metadata = cityLandingMetadata("portland");
export default function Page() { return <CityLandingPage city="portland" />; }
