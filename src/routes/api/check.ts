import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { check } from "@/lib/inkguard-engine";
import { DEMO_FACTS, DEMO_RULES } from "@/lib/inkguard-data";

// Mirrors backend/models.py: CheckRequest { text }, CheckResponse { findings, ai_available }.
const checkRequest = z.object({ text: z.string().min(1).max(20000) });

export const Route = createFileRoute("/api/check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = checkRequest.safeParse(body);
        if (!parsed.success) {
          return Response.json({ detail: 'Body must be {"text": string}' }, { status: 400 });
        }

        // Deterministic checks always run; AI tone findings are optional and
        // disabled in this demo (same contract as backend/main.py).
        const findings = check(parsed.data.text, DEMO_RULES, DEMO_FACTS);

        return Response.json({ findings, ai_available: false });
      },
    },
  },
});
