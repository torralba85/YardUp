import { permanentRedirect } from "next/navigation";

// Use the established local cost guide until a supported San Diego demo exists.
export default function Page() { permanentRedirect("/adu/ca/san-diego/cost"); }
