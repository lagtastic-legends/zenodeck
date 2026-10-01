import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `You are Zeno, the dedicated AI assistant for the ZenoDeck app. Your SOLE purpose is to help users navigate and understand ZenoDeck's features: video transcoding, audio conversion, screen recording, QR generation, PDF tools, and image manipulation.

CRITICAL RULE: DO NOT write code, solve programming problems, or help build projects. DO NOT perform general knowledge tasks unrelated to ZenoDeck. If a user asks for code, programming help, or anything outside the scope of ZenoDeck's features, you MUST reject the request by replying EXACTLY with this error message:

'this question you are asking is not for me'

Keep your valid answers concise and friendly, matching a Dark Sci-Fi aesthetic.`;

export async function POST(req: Request) {
  try {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Internal Server Error: API key missing" },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const isStream = searchParams.get("stream") === "true";

    const endpointPath = isStream 
      ? `streamGenerateContent?alt=sse&key=${apiKey}` 
      : `generateContent?key=${apiKey}`;

    // Fast, resilient model hierarchy: try 3.8 first; if 503/busy, seamlessly failover to 3.6, flash-lite, and flash-latest
    const candidateModels = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
    let response: Response | null = null;
    let lastErrorData = "";

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      const payload: Record<string, unknown> = {
        contents: body.contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
      };

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpointPath}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          response = res;
          break;
        }

        lastErrorData = await res.text();
        // If 503 (High demand), 429 (Rate limit), or 404 (unavailable), immediately try next model
        if (res.status === 503 || res.status === 429 || res.status === 404) {
          continue;
        } else {
          response = res;
          break;
        }
      } catch (err: unknown) {
        lastErrorData = err instanceof Error ? err.message : String(err);
      }
    }

    if (!response || !response.ok) {
      return NextResponse.json(
        { error: `Google API Error: ${lastErrorData || "Service temporarily unavailable"}` },
        { status: response?.status || 503, headers: corsHeaders }
      );
    }

    if (isStream && response.body) {
      return new Response(response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error: any) {
    console.error("AI API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
