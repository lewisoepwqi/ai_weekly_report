import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, weeks } from "@/lib/db/schema";
import { errUnauthorized, errValidation, errNotFound, errInternal } from "@/lib/api-error";

type RouteContext = { params: Promise<{ weekId: string }> };

const ItemPatchSchema = z.object({
  // Lookup key — must provide at least title
  title:            z.string().min(1),
  section:          z.string().optional(),   // narrow lookup if titles collide across sections

  // Patchable fields — all optional, only provided fields are updated
  summary:          z.string().optional(),
  highlight:        z.string().optional(),
  category:         z.string().optional(),
  tags:             z.union([z.string(), z.array(z.string())]).optional(),
  image_url:        z.string().url().optional(),
  logo_url:         z.string().url().optional(),
  source_url:       z.string().url().optional(),
  author:           z.string().optional(),
  author_label:     z.string().optional(),
  author_avatar:    z.string().url().optional(),
  heat_data:        z.string().optional(),
  ai_summary:       z.string().optional(),
  ai_detail:        z.string().optional(),
  sort_order:       z.number().int().min(0).max(100).optional(),
  source_platform:  z.string().optional(),
  source_date:      z.string().optional(),
  source_type:      z.string().optional(),
});

const PatchBodySchema = z.array(ItemPatchSchema).min(1);

/**
 * PATCH /api/data/weeks/:weekId/items
 *
 * 局部更新一期中的指定条目，只更新传入字段，不删除其他条目。
 * 以 title（+可选 section）为 lookup key 匹配条目。
 *
 * Headers:
 *   x-api-key: <API_KEY>
 *
 * Body (数组，每项必须包含 title):
 *   [
 *     {
 *       "title": "要更新的条目标题",     // 必填，用于查找条目
 *       "section": "hot_topics",        // 可选，有重名时用于缩小范围
 *       "ai_summary": "新的AI摘要",     // 只传需要更新的字段
 *       "ai_detail":  "新的AI详情",
 *       "author_avatar": "https://..."
 *     }
 *   ]
 *
 * 返回:
 *   { ok: true, weekId, updated: N, notFound: ["title1", ...] }
 *   notFound 列出未匹配到的 title（可能拼写有误或条目不存在）
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { weekId } = await params;
  if (!auth(req)) return errUnauthorized(!!req.headers.get("x-api-key"));

  try {
    const body = await req.json();
    const patches = PatchBodySchema.parse(body);

    // Verify week exists
    const weekExists = await db.select({ id: weeks.id }).from(weeks).where(eq(weeks.id, weekId)).get();
    if (!weekExists) {
      return errNotFound("Week", weekId, 'Use GET /api/week/list to see available week IDs.');
    }

    let updated = 0;
    const notFound: string[] = [];

    for (const patch of patches) {
      const { title, section, tags, ...rest } = patch;

      // Build lookup condition
      const conditions = [eq(items.week_id, weekId), eq(items.title, title)];
      if (section) conditions.push(eq(items.section, section));

      const existing = await db.select({ id: items.id }).from(items).where(and(...conditions)).get();
      if (!existing) {
        notFound.push(section ? `${section}/${title}` : title);
        continue;
      }

      // Build update object — only include defined fields
      const update: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) update[k] = v;
      }
      if (tags !== undefined) {
        update.tags = Array.isArray(tags) ? tags.join(",") : tags;
      }

      if (Object.keys(update).length > 0) {
        await db.update(items).set(update).where(eq(items.id, existing.id)).run();
        updated++;
      }
    }

    return NextResponse.json({ ok: true, weekId, updated, notFound });
  } catch (e: unknown) {
    if (e instanceof ZodError) {
      return errValidation(
        e.issues,
        'Body must be an array. Each item requires "title" (string). All other fields are optional.',
      );
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }
    return errInternal(e);
  }
}
