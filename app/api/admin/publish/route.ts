import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { resolve } from "path";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { errUnauthorized, errValidation, errInternal, errNotFound } from "@/lib/api-error";

/**
 * POST /api/admin/publish
 *
 * 仅发布指定周次的周报
 * 将周次状态从 "draft" 改为 "published"
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body:
 *   {
 *     week: string    必填，格式 "YYYY-WNN"，如 "2026-W11"
 *   }
 *
 * 成功:
 *   {
 *     ok: true,
 *     weekId: string,
 *     status: "published"
 *   }
 *
 * 错误:
 *   - 404: 周次不存在
 *   - 500: 数据库错误
 */

// Validation schema
const PublishSchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/, 'Week format should be "YYYY-WNN"'),
});

function runPublishTool(weekId: string): unknown {
  const projectRoot = resolve(process.cwd());
  const cmd = `node tools/publish-week.js --week ${weekId}`;

  try {
    const output = execSync(cmd, {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(output.trim());
  } catch (e: unknown) {
    const error = e as Error & { stderr?: string; stdout?: string };
    console.error(`[Publish] Failed:`, error.message);
    if (error.stderr) console.error("stderr:", error.stderr);
    if (error.stdout) {
      try {
        const parsed = JSON.parse(error.stdout.trim());
        // If the tool explicitly returned not found, propagate that
        if (parsed.error && parsed.error.includes("not found")) {
          return { ok: false, notFound: true, error: parsed.error };
        }
        return parsed;
      } catch {
        // Not JSON, use error message
      }
    }
    throw new Error(`Publish failed: ${error.message}`);
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
    const parsed = PublishSchema.safeParse(body);

    if (!parsed.success) {
      return errValidation(parsed.error.issues, 'Required field: week (string, format "YYYY-WNN")');
    }

    const { week } = parsed.data;

    console.log(`[Admin] Publishing week ${week}`);

    // Run publish tool
    const result = runPublishTool(week);

    // Check if the week was not found
    if (result && typeof result === "object" && "notFound" in result) {
      return errNotFound(`Week '${week}' not found`);
    }

    // Check if the tool returned an error response
    if (result && typeof result === "object" && "ok" in result && !result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "publish_failed",
          details: result,
        },
        { status: 500 }
      );
    }

    console.log(`[Admin] Published week ${week}`);

    return NextResponse.json({
      ok: true,
      weekId: week,
      ...(result as Record<string, unknown>),
    });
  } catch (e: unknown) {
    console.error("[Admin Publish] Error:", e);
    return errInternal(e);
  }
}
