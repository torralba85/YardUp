export const runtime = "nodejs";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const address = (form.get("address") as string) || "";
    const imageFile = form.get("image") as File | null;

    if (!imageFile) {
      return NextResponse.json({ error: "Please upload a property photo." }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";

    const prompt = `You are an expert ADU (Accessory Dwelling Unit) feasibility analyst in the United States.

Analyze the property photo and address, then return ONLY a JSON object inside triple-backtick code fences:

\`\`\`json
{
  "rent": "$X,XXX/mo",
  "rentRange": "$X,XXX–$X,XXX/mo",
  "buildRange": "$XXXk–$XXXk",
  "builderCount": 7,
  "aduSize": "XXX sq ft",
  "description": "1–2 sentence feasibility summary (max 35 words)"
}
\`\`\`

Base rent/build costs on the address location. If address is missing, use Bay Area CA averages.
Estimate usable yard area from the photo. Prefer a detached studio or 1BR ADU unless the yard is very small (then JADU).
No text outside the JSON code fence.
After the JSON, generate a photorealistic image showing an ADU added to the backyard in the photo, matching the architectural style of the main house.

Address: ${address || "not provided"}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      } as any,
    });

    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    let textContent = "";
    let mockupImageBase64 = "";
    let mockupMimeType = "image/png";

    for (const part of parts) {
      if ("text" in part && part.text) {
        textContent += part.text;
      } else if ("inlineData" in part && part.inlineData?.data) {
        mockupImageBase64 = part.inlineData.data;
        mockupMimeType = part.inlineData.mimeType ?? "image/png";
      }
    }

    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : textContent.trim();
    const parsed = JSON.parse(jsonString);

    return NextResponse.json({
      rent: parsed.rent ?? "$2,450/mo",
      rentRange: parsed.rentRange ?? "$2,310–$2,580/mo",
      buildRange: parsed.buildRange ?? "$278k–$334k",
      builderCount: parsed.builderCount ?? 7,
      description: parsed.description ?? "",
      aduSize: parsed.aduSize ?? "",
      mockupImageBase64,
      mockupMimeType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
