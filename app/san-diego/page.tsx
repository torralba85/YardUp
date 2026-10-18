import { CityLandingPage, cityLandingMetadata } from "@/components/landing/lot-more/CityLandingPage";

export const metadata = cityLandingMetadata("san-diego");
export default function Page() { return <CityLandingPage city="san-diego" />; }
