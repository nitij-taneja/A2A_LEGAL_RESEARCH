import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  cases: router({
    create: publicProcedure
      .input((val: unknown) => {
        if (typeof val !== "object" || val === null) throw new Error("Invalid input");
        const obj = val as Record<string, unknown>;
        return {
          title: String(obj.title || ""),
          description: (obj.description as string | null) || null,
          query: String(obj.query || ""),
        };
      })
      .mutation(async ({ ctx, input }) => {
        try {
          const { createCase, ensureDemoUser } = await import("./db");
          const userId = await ensureDemoUser();
          const result = await createCase(userId, input.title, input.description, input.query);
          return { caseId: (result as any).insertId || 1 };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[tRPC] cases.create failed:", msg, err);
          throw new Error(`Failed to create case: ${msg}`);
        }
      }),

    list: publicProcedure.query(async () => {
      const { getCasesByUserId, ensureDemoUser } = await import("./db");
      const userId = await ensureDemoUser();
      return await getCasesByUserId(userId);
    }),

    get: publicProcedure
      .input((val: unknown) => {
        if (typeof val !== "object" || val === null) throw new Error("Invalid input");
        return { caseId: Number((val as Record<string, unknown>).caseId) };
      })
      .query(async ({ input }) => {
        const { getCaseById } = await import("./db");
        return await getCaseById(input.caseId);
      }),

    // --- UPDATED EXECUTE PROCEDURE ---
    execute: publicProcedure
      .input((val: unknown) => {
        if (typeof val !== "object" || val === null) throw new Error("Invalid input");
        return { caseId: Number((val as Record<string, unknown>).caseId) };
      })
      .mutation(async ({ input }) => {
        const { updateCaseStatus, getCaseById } = await import("./db");
        const { executeLegalResearchWorkflow } = await import("./agents");

        const caseData = await getCaseById(input.caseId);
        if (!caseData) throw new Error("Case not found");

        await updateCaseStatus(input.caseId, "processing");

        try {
          const result = await executeLegalResearchWorkflow(
            input.caseId,
            caseData.query,
            (caseData as any).description || undefined
          );

          if (result.success) {
            await updateCaseStatus(input.caseId, "completed");
            const { createResult } = await import("./db");
            
            const raw = typeof result.result === "string" ? result.result : JSON.stringify(result.result);
            
            // Aggressive cleanup for JSON parsing
            const clean = raw
              .trim()
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/```\s*$/i, "");
            
            let parsed: any | null = null;
            try {
              parsed = JSON.parse(clean);
            } catch (e) {
              console.error("Failed to parse verdict JSON; using raw fallback.", e);
              // Fallback object so we don't crash
              parsed = {
                summary: "Automated parsing failed. See detailed analysis below.",
                analysis: clean,
                recommendation: "Please review raw findings.",
                riskAssessment: "Unknown",
                citations: []
              };
            }

            if (parsed && typeof parsed === "object") {
              await createResult(
                input.caseId,
                parsed.summary || null,
                JSON.stringify(parsed),
                null,
                null,
                parsed.recommendation || null
              );
            }
          } else {
            await updateCaseStatus(input.caseId, "failed");
          }

          return result;
        } catch (error) {
          await updateCaseStatus(input.caseId, "failed");
          throw error;
        }
      }),
  }),

  agentLogs: router({
    getByCaseId: publicProcedure
      .input((val: unknown) => {
        if (typeof val !== "object" || val === null) throw new Error("Invalid input");
        return { caseId: Number((val as Record<string, unknown>).caseId) };
      })
      .query(async ({ input }) => {
        const { getAgentLogsByCaseId } = await import("./db");
        return await getAgentLogsByCaseId(input.caseId);
      }),
  }),

  results: router({
    getByCaseId: publicProcedure
      .input((val: unknown) => {
        if (typeof val !== "object" || val === null) throw new Error("Invalid input");
        return { caseId: Number((val as Record<string, unknown>).caseId) };
      })
      .query(async ({ input }) => {
        const { getResultByCaseId } = await import("./db");
        return await getResultByCaseId(input.caseId);
      }),
    export: publicProcedure
      .input((val: unknown) => {
        if (typeof val !== "object" || val === null) throw new Error("Invalid input");
        const obj = val as Record<string, unknown>;
        const fmt = String(obj.format || "markdown").toLowerCase();
        return { caseId: Number(obj.caseId), format: fmt === "json" ? "json" : "markdown" as const };
      })
      .query(async ({ input }) => {
        const { getCaseById, getResultByCaseId } = await import("./db");
        const c = await getCaseById(input.caseId);
        if (!c) throw new Error("Case not found");
        const r = await getResultByCaseId(input.caseId);
        const title = c.title || `case-${input.caseId}`;
        
        if (input.format === "json") {
          return { 
            filename: `${title}_verdict.json`, 
            mime: "application/json", 
            content: r?.findings || "{}" 
          };
        }
        
        let md = `# Research Results: ${c.title}\n\n`;
        if (r?.summary) md += `## Summary\n\n${r.summary}\n\n`;
        if (r?.findings) {
             try {
                const parsed = JSON.parse(r.findings);
                if(parsed.analysis) md += `## Analysis\n\n${parsed.analysis}\n\n`;
                if(parsed.recommendation) md += `## Recommendation\n\n${parsed.recommendation}\n\n`;
             } catch {
                md += `## Findings\n\n${r.findings}`;
             }
        }
        return { filename: `${title}.md`, mime: "text/markdown", content: md };
      }),
  }),
});

export type AppRouter = typeof appRouter;