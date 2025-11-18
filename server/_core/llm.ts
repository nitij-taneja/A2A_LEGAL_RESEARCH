import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  provider?: "groq" | "forge" | "gemini" | "auto" | "demo";
  geminiApiKeyOverride?: string;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// --- Helpers ---

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") return part;
  if (part.type === "image_url") return part;
  if (part.type === "file_url") return part;
  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
    return { role, name, tool_call_id, content };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, name, content: contentParts[0].text };
  }
  return { role, name, content: contentParts };
};

const normalizeMessageContentForGemini = (content: MessageContent | MessageContent[]): string => {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(c => (typeof c === "string" ? c : c.type === "text" ? c.text : "")).join("\n");
  }
  return (content as TextContent).text || "";
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "[https://forge.manus.im/v1/chat/completions](https://forge.manus.im/v1/chat/completions)";

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const requested = params.provider && params.provider !== "auto" ? params.provider : undefined;
  const canGroq = !!ENV.groqApiKey;
  const canForge = !!ENV.forgeApiKey;
  const canGemini = !!ENV.geminiApiKey;
  const provider = requested ?? (canGemini ? "gemini" : canGroq ? "groq" : canForge ? "forge" : "demo");

  try {
    const full = String(process.env.LOG_FULL_KEYS || "").toLowerCase() === "true";
    const gemShown = ENV.geminiApiKey ? (full ? ENV.geminiApiKey : `${ENV.geminiApiKey.slice(0, 6)}...`) : "none";
    console.log(`[LLM] Provider=${provider} | Key=${gemShown}`);
  } catch {}

  // --- 1. GROQ IMPLEMENTATION ---
  if (provider === "groq") {
    const { messages, tools, toolChoice, tool_choice } = params;
    const openaiMessages = messages.map((m) => {
      const nm = normalizeMessage(m) as any;
      const content = Array.isArray(nm.content) ? JSON.stringify(nm.content) : nm.content;
      return { role: nm.role, content };
    });

    const body: any = {
      model: "llama-3.1-8b-instant",
      messages: openaiMessages,
      max_tokens: 4096,
    };
    
    // Handle Tools (Simplified logic)
    if(toolChoice || tool_choice) { /* tool logic omitted for brevity as mostly unused here */ }

    const resp = await fetch("[https://api.groq.com/openai/v1/chat/completions](https://api.groq.com/openai/v1/chat/completions)", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.groqApiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`GROQ invoke failed: ${resp.status} ${resp.statusText} – ${t}`);
    }
    return await resp.json();
  }

  // --- 2. GEMINI IMPLEMENTATION ---
  if (provider === "gemini") {
    const apiKey = params.geminiApiKeyOverride || ENV.geminiApiKey;
    if (!apiKey) throw new Error("Gemini API Key is missing");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Map OpenAI messages to Gemini contents
    const contents = params.messages.map(m => ({
      role: m.role === "user" || m.role === "system" ? "user" : "model", 
      parts: [{ text: normalizeMessageContentForGemini(m.content) }]
    }));

    const body = {
      contents: contents,
      generationConfig: {
        temperature: 0.2,
        // CRITICAL FIX: Increased from 1024 to 8192 to prevent JSON cut-off
        maxOutputTokens: 8192, 
        responseMimeType: (params.responseFormat?.type === "json_object" || params.response_format?.type === "json_schema") 
          ? "application/json" 
          : "text/plain"
      }
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Gemini API Error ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    return {
      id: "gemini-" + Date.now(),
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [{
        index: 0,
        message: { role: "assistant", content: text },
        finish_reason: "stop"
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }

  // --- 3. FORGE IMPLEMENTATION ---
  if (provider === "forge") {
    const { messages } = params;
    const payload = {
      model: "manus-1",
      messages: messages.map(normalizeMessage),
      max_tokens: 4096
    };

    const response = await fetch(resolveApiUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Forge invoke failed: ${response.status} - ${errorText}`);
    }
    return (await response.json()) as InvokeResult;
  }

  // --- 4. DEMO FALLBACK ---
  return {
    id: "demo",
    created: Math.floor(Date.now() / 1000),
    model: "demo-mock",
    choices: [{
      index: 0,
      message: { role: "assistant", content: JSON.stringify({ summary: "Demo Mode", analysis: "No API Key configured.", recommendation: "Check .env", riskAssessment: "None" }) },
      finish_reason: "stop",
    }],
  };
}