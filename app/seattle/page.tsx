import { CityLandingPage, cityLandingMetadata } from "@/components/landing/lot-more/CityLandingPage";

export const metadata = cityLandingMetadata("seattle");
export default function Page() { return <CityLandingPage city="seattle" />; }
