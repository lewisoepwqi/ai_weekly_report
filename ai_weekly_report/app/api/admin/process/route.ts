import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { resolve } from "path";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { errUnauthorized, errValidation, errInternal } from "@/lib/api-error";

/**
 * POST /api/admin/process
 *
 * 仅处理原始数据（AI分类）
 * 将 raw_items 表中的未处理数据通过 AI 分类、摘要后写入 items 表
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body:
 *   {
 *     week: string        必填，格式 "YYYY-WNN"，如 "2026-W11"
 *     noAi?: boolean      可选，跳过 AI，仅做规则筛选（降级模式）
 *     force?: boolean     可选，重新处理已处理的数据（会清空已有 items）
 *   }
 *
 * 成功:
 *   {
 *     ok: true,
 *     weekId: string,
 *     rawProcessed: number,    // 处理的原始数据条数
 *     itemsCreated: number,    // 生成的精选条目数
 *     mode: "ai" | "rule-based"
 *   }
 */

// Validation schema
const ProcessSchema = z.object({
  week: z.string().regex(/^\d{4}-W\d{2}$/, 'Week format should be "YYYY-WNN"'),
  noAi: z.boolean().optional(),
  force: z.boolean().optional(),
});

function runProcessTool(weekId: string, noAi: boolean, force: boolean): unknown {
  const projectRoot = resolve(process.cwd());

  const flags = [
    `--week ${weekId}`,
    noAi ? "--no-ai" : "",
    force ? "--force" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const cmd = `node tools/process-data.js ${flags}`;

  try {
    const output = execSync(cmd, {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return JSON.parse(output.trim());
  } catch (e: unknown) {
    const error = e as Error & { stderr?: string; stdout?: string };
    console.error(`[Process] Failed:`, error.message);
    if (error.stderr) console.error("stderr:", error.stderr);
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout.trim());
      } catch {
        // Not JSON, use error message
      }
    }
    throw new Error(`Process failed: ${error.message}`);
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
    const parsed = ProcessSchema.safeParse(body);

    if (!parsed.success) {
      return errValidation(parsed.error.issues, 'Required field: week (string, format "YYYY-WNN")');
    }

    const { week, noAi = false, force = false } = parsed.data;

    console.log(`[Admin] Processing data for ${week} (noAi=${noAi}, force=${force})`);

    // Run process tool
    const result = runProcessTool(week, noAi, force);

    // Check if the tool returned an error response
    if (result && typeof result === "object" && "ok" in result && !result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "process_failed",
          details: result,
        },
        { status: 500 }
      );
    }

    console.log(`[Admin] Processing completed for ${week}`);

    return NextResponse.json({
      ok: true,
      weekId: week,
      ...(result as Record<string, unknown>),
    });
  } catch (e: unknown) {
    console.error("[Admin Process] Error:", e);
    return errInternal(e);
  }
}
