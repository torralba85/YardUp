import { createAIPanelRoute } from "@/lib/server/ai-pipeline";
import { projectBriefDef } from "@/lib/server/panels/project-brief";

export const runtime = "nodejs";
export const maxDuration = 90;

export const POST = createAIPanelRoute(projectBriefDef);
