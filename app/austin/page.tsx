import { CityLandingPage, cityLandingMetadata } from "@/components/landing/lot-more/CityLandingPage";

export const metadata = cityLandingMetadata("austin");
export default function Page() { return <CityLandingPage city="austin" />; }
