import { createAIPanelRoute } from "@/lib/server/ai-pipeline";
import { permitPathwayDef } from "@/lib/server/panels/permit-pathway";

export const runtime = "nodejs";
// The agentic tool loop makes several model calls per request; give it headroom
// beyond the default serverless budget (see runAgentic's cumulative deadlineMs).
export const maxDuration = 90;

export const POST = createAIPanelRoute(permitPathwayDef);
