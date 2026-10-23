import { Router, type IRouter, type Request } from "express";
import { db, analyticsEventsTable, waitlistSignupsTable } from "@workspace/db";
import {
  GetDetectedLocaleResponse,
  RecordAnalyticsEventBody,
  RecordAnalyticsEventResponse,
  SubmitWaitlistSignupBody,
  SubmitWaitlistSignupResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const CONSENT_VERSION = "launch-updates-v1";
const signupLimits = new Map<string, { count: number; expiresAt: number }>();
const analyticsLimits = new Map<string, { count: number; expiresAt: number }>();

function hitRateLimit(
  bucket: Map<string, { count: number; expiresAt: number }>,
  key: string,
  maxCount: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  if (bucket.size > 5_000) {
    for (const [entryKey, entry] of bucket) {
      if (entry.expiresAt <= now) bucket.delete(entryKey);
    }
  }

  const existing = bucket.get(key);
  if (!existing || existing.expiresAt <= now) {
    bucket.set(key, { count: 1, expiresAt: now + windowMs });
    return false;
  }
  if (existing.count >= maxCount) return true;
  existing.count += 1;
  return false;
}

function countryFromRequest(req: Request): string | null {
  const candidates = [
    req.get("cf-ipcountry"),
    req.get("x-vercel-ip-country"),
    req.get("x-country-code"),
  ];
  for (const candidate of candidates) {
    const code = candidate?.trim().toUpperCase();
    if (code && /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") {
      return code;
    }
  }

  const languages = (req.get("accept-language") ?? "")
    .split(",")
    .map((entry) => {
      const [tag = "", quality = ""] = entry.trim().split(";");
      const qualityValue = Number(quality.split("=")[1] ?? "1");
      return { tag: tag.trim(), quality: Number.isFinite(qualityValue) ? qualityValue : 0 };
    })
    .sort((a, b) => b.quality - a.quality);
  for (const { tag } of languages) {
    const region = tag.split("-")[1]?.toUpperCase();
    if (region && /^[A-Z]{2}$/.test(region)) return region;
  }
  return null;
}

function localeFor(
  countryCode: string | null,
  acceptLanguage: string | undefined,
): "en" | "pl" | "ar" {
  if (countryCode === "PL") return "pl";
  if (
    countryCode &&
    ["DZ", "BH", "EG", "IQ", "JO", "KW", "LB", "LY", "MA", "OM", "PS", "QA", "SA", "SD", "SY", "TN", "AE", "YE"].includes(
      countryCode,
    )
  ) {
    return "ar";
  }

  const candidates = (acceptLanguage ?? "")
    .split(",")
    .map((entry) => {
      const [tag = "", quality = ""] = entry.trim().split(";");
      const qualityValue = Number(quality.split("=")[1] ?? "1");
      return { language: tag.split("-")[0]?.toLowerCase(), quality: Number.isFinite(qualityValue) ? qualityValue : 0 };
    })
    .sort((a, b) => b.quality - a.quality);
  const preferredLanguage = candidates.find(
    (entry) => entry.language === "pl" || entry.language === "ar",
  )?.language;
  if (preferredLanguage === "pl") return "pl";
  if (preferredLanguage === "ar") return "ar";
  return "en";
}

router.get("/locale", (req, res) => {
  const countryCode = countryFromRequest(req);
  res.json(
    GetDetectedLocaleResponse.parse({
      countryCode,
      locale: localeFor(countryCode, req.get("accept-language")),
    }),
  );
});

router.post("/waitlist", async (req, res): Promise<void> => {
  const parsed = SubmitWaitlistSignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please check the information and try again." });
    return;
  }

  const input = parsed.data;
  if (!input.consent) {
    res.status(400).json({ error: "Consent is required to join the waitlist." });
    return;
  }

  if (hitRateLimit(signupLimits, req.ip || "unknown", 8, 15 * 60 * 1000)) {
    res.status(429).json({ error: "Too many attempts. Please try again later." });
    return;
  }

  // Silently accept honeypot submissions without storing them.
  if (input.website?.trim()) {
    res.status(201).json(SubmitWaitlistSignupResponse.parse({ result: "joined" }));
    return;
  }

  const [created] = await db
    .insert(waitlistSignupsTable)
    .values({
      email: input.email.trim().toLowerCase(),
      audience: input.audience,
      countryCode: input.countryCode,
      accountType: input.accountType ?? null,
      locale: input.locale,
      consentedAt: new Date(),
      consentVersion: CONSENT_VERSION,
    })
    .onConflictDoNothing({
      target: [waitlistSignupsTable.email, waitlistSignupsTable.audience],
    })
    .returning({ id: waitlistSignupsTable.id });

  const result = created ? "joined" : "already_joined";
  res
    .status(created ? 201 : 200)
    .json(SubmitWaitlistSignupResponse.parse({ result }));
});

router.post("/analytics/events", async (req, res): Promise<void> => {
  const parsed = RecordAnalyticsEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid analytics event." });
    return;
  }

  if (hitRateLimit(analyticsLimits, req.ip || "unknown", 120, 60 * 60 * 1000)) {
    res.status(429).json({ error: "Analytics event rate limit exceeded." });
    return;
  }

  const event = parsed.data;
  await db.insert(analyticsEventsTable).values({
    anonymousId: event.anonymousId,
    eventType: event.eventType,
    countryCode: event.countryCode ?? null,
    audience: event.audience ?? null,
    locale: event.locale,
  });

  res
    .status(202)
    .json(RecordAnalyticsEventResponse.parse({ accepted: true }));
});

export default router;
