import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { resolve } from "path";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { errUnauthorized, errValidation, errInternal } from "@/lib/api-error";

/**
 * POST /api/admin/generate
 *
 * 手动生成周报（采集→处理→发布完整流程）
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body:
 *   {
 *     week?: string   可选，格式 "YYYY-WNN"，如 "2026-W11"。不传则使用当前周
 *   }
 *
 * 成功:
 *   {
 *     ok: true,
 *     weekId: string,
 *     results: {
 *       rss: { ok: true, inserted: number, ... },
 *       github: { ok: true, inserted: number, ... },
 *       skillsmp?: { ok: true, ... },
 *       process: { ok: true, rawProcessed: number, itemsCreated: number, ... },
 *       publish: { ok: true, status: "published" }
 *     }
 *   }
 */

// Validation schema
const GenerateSchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/, 'Week format should be "YYYY-WNN"').optional(),
});

function currentWeekId(): string {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function runTool(cmd: string, desc: string): unknown {
  const projectRoot = resolve(process.cwd());
  try {
    const output = execSync(cmd, {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(output.trim());
  } catch (e: unknown) {
    const error = e as Error & { stderr?: string; stdout?: string };
    console.error(`[${desc}] Failed:`, error.message);
    if (error.stderr) console.error("stderr:", error.stderr);
    if (error.stdout) {
      try {
        // Try to parse stdout as JSON error response
        return JSON.parse(error.stdout.trim());
      } catch {
        // Not JSON, ignore
      }
    }
    throw new Error(`${desc} failed: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  // Authentication
  if (!auth(req)) {
    return errUnauthorized(!!req.headers.get("x-api-key"));
  }

  try {
    // Parse and validate request body
    const body = await req.json().catch(() => ({}));
    const parsed = GenerateSchema.safeParse(body);

    if (!parsed.success) {
      return errValidation(
        parsed.error.issues,
        'Optional field: week (string, format "YYYY-WNN", e.g. "2026-W11")'
      );
    }

    const weekId = parsed.data.week ?? currentWeekId();
    const results: Record<string, unknown> = {};

    console.log(`[Admin] Starting full pipeline for ${weekId}`);

    // Step 1: Collect RSS
    try {
      results.rss = runTool("node tools/collect-rss.js", "Collect RSS");
    } catch (e: unknown) {
      results.rss = { ok: false, error: (e as Error).message };
    }

    // Step 2: Collect GitHub
    try {
      results.github = runTool("node tools/collect-github.js", "Collect GitHub");
    } catch (e: unknown) {
      results.github = { ok: false, error: (e as Error).message };
    }

    // Step 3: Collect SkillsMP (optional - may fail if not configured)
    try {
      results.skillsmp = runTool("node tools/collect-skillsmp.js", "Collect SkillsMP");
    } catch (e: unknown) {
      results.skillsmp = { ok: false, error: (e as Error).message, skipped: true };
    }

    // Step 4: Process data with AI
    try {
      results.process = runTool(`node tools/process-data.js --week ${weekId}`, "Process Data");
    } catch (e: unknown) {
      results.process = { ok: false, error: (e as Error).message };
      // If processing fails, don't try to publish
      return NextResponse.json(
        {
          ok: false,
          weekId,
          results,
          error: "Processing failed, publish skipped",
        },
        { status: 500 }
      );
    }

    // Step 5: Publish
    try {
      results.publish = runTool(`node tools/publish-week.js --week ${weekId}`, "Publish Week");
    } catch (e: unknown) {
      results.publish = { ok: false, error: (e as Error).message };
      return NextResponse.json(
        {
          ok: false,
          weekId,
          results,
          error: "Publish failed",
        },
        { status: 500 }
      );
    }

    console.log(`[Admin] Full pipeline completed for ${weekId}`);

    return NextResponse.json({
      ok: true,
      weekId,
      results,
    });
  } catch (e: unknown) {
    console.error("[Admin Generate] Error:", e);
    return errInternal(e);
  }
}
