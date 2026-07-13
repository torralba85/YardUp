import type {
  AIADUConcept,
  AIProjectBriefInput,
  AIProjectBriefResponse,
} from "./ai-types";
import type { ADUConfig, Parcel } from "./feasibility";

export class AIRequestError extends Error {
  userMessage: string;

  constructor(userMessage: string) {
    super(userMessage);
    this.name = "AIRequestError";
    this.userMessage = userMessage;
  }
}

export async function requestProjectBrief(
  input: AIProjectBriefInput,
  idToken: string,
): Promise<AIProjectBriefResponse> {
  const res = await fetch("/api/ai/project-brief", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) throw new AIRequestError(await readError(res));
  return (await res.json()) as AIProjectBriefResponse;
}

export async function requestADUConcept({
  image,
  parcel,
  config,
}: {
  image: File;
  parcel: Parcel & { zoning?: string; source?: string };
  config: ADUConfig;
}): Promise<AIADUConcept> {
  const formData = new FormData();
  formData.set("image", image);
  formData.set("parcel", JSON.stringify(parcel));
  formData.set("config", JSON.stringify(config));

  const res = await fetch("/api/ai/adu-concept", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new AIRequestError(await readError(res));
  return (await res.json()) as AIADUConcept;
}

async function readError(res: Response): Promise<string> {
  const fallback = "AI is unavailable right now. Please try again.";
  try {
    const json = (await res.json()) as { error?: string };
    return json.error || fallback;
  } catch {
    return fallback;
  }
}
