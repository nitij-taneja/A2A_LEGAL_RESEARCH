import { invokeLLM } from "./_core/llm";
import { addAgentLog } from "./db";
import { ENV } from "./_core/env";

export interface AgentExecutionContext {
  caseId: number;
  query: string;
  description?: string; // <--- ADDED THIS
  logs: Array<{ agent: string; action: string; message: string }>;
}

function clampText(s: string, max = 20000): string {
  if (!s) return s;
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 500)) + "\n\n[...truncated for model limits...]";
}

// <--- IMPROVED JSON CLEANER --->
function cleanJsonOutput(text: string): string {
  if (!text) return "{}";
  // 1. Remove markdown
  let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  // 2. Extract JSON object if there is extra chatter
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return clean;
}

async function webResearcherAgent(
  ctx: AgentExecutionContext,
  searchQuery: string
): Promise<string> {
  const action = "searching";
  
  // Combine query with description context for better search formulation
  const context = `Query: ${searchQuery}\nContext: ${ctx.description || "No background provided."}`;

  try {
    await addAgentLog(ctx.caseId, "WebResearcher", "started", searchQuery);

    const searchFormulation = await invokeLLM({
      messages: [
        {
          role: "user",
          content: `You are a legal researcher. Generate 3 specific search queries to find case law or statutes relevant to this situation.
          
          Situation:
          ${clampText(context, 2000)}
          
          Return ONLY a JSON array: {"queries": ["string", "string"]}`,
        },
      ],
      response_format: { type: "json_object" },
      provider: ENV.geminiApiKey ? "gemini" : "demo",
    });

    let queries: string[] = [];
    try {
      const clean = cleanJsonOutput(searchFormulation.choices[0].message.content as string);
      queries = JSON.parse(clean).queries || [searchQuery];
    } catch {
      queries = [searchQuery];
    }

    // Execute Search
    let searchResults = "";
    if (ENV.tavilyApiKey) {
      const aggregated: any[] = [];
      // Limit to 2 queries to save API credits/time
      for (const subq of queries.slice(0, 2)) { 
        try {
          const resp = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              api_key: ENV.tavilyApiKey,
              query: subq,
              include_answer: true,
              max_results: 3,
            }),
          });
          if (resp.ok) {
            const data = await resp.json();
            aggregated.push(...(data.results || []));
          }
        } catch (e) { console.error(e); }
      }
      
      if (aggregated.length > 0) {
         searchResults = aggregated.map((r, i) => `Source [${i+1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`).join("\n\n");
      } else {
         searchResults = "No direct web results found. Relying on general legal knowledge.";
      }
    } else {
      searchResults = "Web Search Disabled (No API Key). Analysis will be based on internal knowledge.";
    }

    await addAgentLog(ctx.caseId, "WebResearcher", "completed", searchQuery, searchResults, `Found ${searchResults.length > 200 ? "results" : "no results"}`);
    return searchResults;

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await addAgentLog(ctx.caseId, "WebResearcher", "failed", searchQuery, undefined, msg);
    return "Search failed. Proceeding with internal analysis.";
  }
}

async function researchAssociateAgent(
  ctx: AgentExecutionContext,
  searchResults: string
): Promise<string> {
  // <--- CRITICAL FIX: Include User Description here --->
  const input = `USER QUERY: ${ctx.query}
  
  CASE FACTS (Important): 
  ${ctx.description || "None provided"}

  WEB SEARCH RESULTS: 
  ${searchResults}`;
  
  const inputClamped = clampText(input);

  try {
    await addAgentLog(ctx.caseId, "Associate", "started", "Synthesizing facts and search results...");

    const synthesis = await invokeLLM({
      messages: [
        {
          role: "user",
          content: `You are a Legal Associate. Synthesize the Case Facts and Web Search Results.
          Identify relevant statutes (e.g., Article 14, Contract Act) and precedents.
          
          Return JSON: {"precedents": [], "statutes": [], "principles": [], "arguments": []}`,
        },
        { role: "user", content: inputClamped }
      ],
      response_format: { type: "json_object" },
      provider: ENV.geminiApiKey ? "gemini" : "demo",
    });

    const output = cleanJsonOutput(synthesis.choices[0].message.content as string);
    await addAgentLog(ctx.caseId, "Associate", "completed", "Synthesized Analysis", output, "Synthesis complete");
    return output;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await addAgentLog(ctx.caseId, "Associate", "failed", "Synthesis", undefined, msg);
    return JSON.stringify({ error: msg, arguments: ["Analysis failed"] });
  }
}

async function lawyerAgent(
  ctx: AgentExecutionContext,
  synthesis: string
): Promise<string> {
  // <--- CRITICAL FIX: Lawyer also needs the Case Facts --->
  const input = `CASE FACTS: ${ctx.description || "N/A"}
  
  ASSOCIATE SYNTHESIS: 
  ${synthesis}`;
  
  const inputClamped = clampText(input);

  try {
    await addAgentLog(ctx.caseId, "Lawyer", "started", "Drafting final verdict...");

    const verdict = await invokeLLM({
      messages: [
        {
          role: "user",
          content: `You are a Senior Judge/Lawyer. Write a verdict based on the Facts and Synthesis.
          
          OUTPUT FORMAT (JSON ONLY):
          {
            "summary": "Brief summary of the case facts (2-3 sentences)",
            "analysis": "Legal reasoning applying statutes/precedents to the facts",
            "recommendation": "Clear advice for the client",
            "riskAssessment": "High/Medium/Low with reason",
            "citations": ["List specific sections/cases"]
          }
          Do NOT include markdown formatting.`
        },
        { role: "user", content: inputClamped }
      ],
      response_format: { type: "json_object" },
      provider: ENV.geminiApiKey ? "gemini" : "demo",
    });

    const output = cleanJsonOutput(verdict.choices[0].message.content as string);
    await addAgentLog(ctx.caseId, "Lawyer", "completed", "Verdict", output, "Verdict delivered");
    return output;
  } catch (error) {
    throw error;
  }
}

export async function executeLegalResearchWorkflow(
  caseId: number,
  query: string,
  description?: string // <--- ADDED ARGUMENT
): Promise<{
  success: boolean;
  result?: string;
  logs: Array<any>;
  error?: string;
}> {
  const ctx: AgentExecutionContext = { caseId, query, description, logs: [] };

  try {
    await addAgentLog(caseId, "Lawyer", "initiated", query);
    
    // 1. Researcher
    const searchResults = await webResearcherAgent(ctx, query);
    
    // 2. Associate (Now takes context automatically)
    const synthesis = await researchAssociateAgent(ctx, searchResults);
    
    // 3. Lawyer
    const verdict = await lawyerAgent(ctx, synthesis);

    return { success: true, result: verdict, logs: ctx.logs };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, logs: ctx.logs, error: msg };
  }
}