import { Capacitor } from "@capacitor/core";

export type MessageRole = "user" | "model";

export interface ChatMessage {
  id?: string;
  role: MessageRole;
  content: string;
  timestamp?: number;
}

const getAiEndpoint = (params = ""): string => {
  const query = params ? (params.startsWith("?") ? params : `?${params}`) : "";
  const isNative = typeof window !== "undefined" && Capacitor.isNativePlatform?.() === true;

  // On native Android APK (where origin is localhost without local server), call production deployment
  if (isNative) {
    const remote = process.env.NEXT_PUBLIC_APP_URL || "https://omni-tool-two.vercel.app";
    return `${remote.replace(/\/+$/, "")}/api/ai/${query}`;
  }

  // In browser environments
  if (typeof window !== "undefined" && window.location?.origin) {
    // If not local dev port 3000 and origin is localhost/capacitor, route to remote host
    if (window.location.hostname === "localhost" && window.location.port !== "3000") {
      const remote = process.env.NEXT_PUBLIC_APP_URL || "https://omni-tool-two.vercel.app";
      return `${remote.replace(/\/+$/, "")}/api/ai/${query}`;
    }
    return `/api/ai/${query}`;
  }

  const fallback = process.env.NEXT_PUBLIC_APP_URL || "https://omni-tool-two.vercel.app";
  return `${fallback.replace(/\/+$/, "")}/api/ai/${query}`;
};

export const generateAiResponse = async (messages: ChatMessage[]) => {
  try {
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(getAiEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
    });

    const responseText = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Server returned non-JSON response: ${responseText.slice(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Connection failed: ${error?.message || "Unknown error occurred"}`;
  }
};

export const streamAiResponse = async function* (messages: ChatMessage[], signal?: AbortSignal) {
  try {
    const contents = messages.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(getAiEndpoint("?stream=true"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let errorMsg = `HTTP ${response.status}`;
      try {
        const json = JSON.parse(text);
        if (json?.error) errorMsg = json.error;
      } catch {}
      throw new Error(errorMsg);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (signal?.aborted) break;
        const trimmed = line.trim();
        if (trimmed === "") continue;
        if (trimmed.startsWith("data: ")) {
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              yield text;
            }
          } catch (e) {
            // ignore JSON parse errors from partial chunks
          }
        }
      }
    }
  } catch (error: any) {
    if (signal?.aborted || error?.name === "AbortError") {
      return;
    }
    console.error("Gemini API Error:", error);
    yield `\n\n[Connection failed: ${error?.message || "Unknown error"}]`;
  }
};
