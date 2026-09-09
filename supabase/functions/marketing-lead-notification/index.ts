// ---------------------------------------------------------------------------
// marketing-lead-notification
//
// Fires on INSERT into the marketing schema's inbound tables and sends two
// emails: an internal notification to the team, and an acknowledgement to the
// person who submitted.
//
// Wired as a Supabase Database Webhook on:
//   marketing.leads                  -> new enquiry / demo request / download
//   marketing.assessments            -> Secure Score submitted
//   marketing.workshop_registrations -> workshop seat booked
//
// See marketing-webhooks-migration.sql for the triggers.
//
// WHY AN EDGE FUNCTION rather than sending from the site's server action:
//   * both the marketing site and the portal can create leads, and a database
//     webhook fires no matter which one wrote the row;
//   * SMTP credentials stay in Supabase secrets instead of being copied into a
//     second application's environment;
//   * if the site's request dies after the INSERT commits, the notification
//     still goes out.
//
// Deploy:
//   supabase functions deploy marketing-lead-notification --no-verify-jwt
//   supabase secrets set SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... \
//     SMTP_PASSWORD=... LEADS_NOTIFICATION_EMAIL=... MARKETING_WEBHOOK_SECRET=...
//
// --no-verify-jwt is required because the trigger authenticates with the
// shared secret below rather than a user JWT. That makes the secret check
// mandatory, not optional -- without it the function is an open relay for
// anyone who discovers the URL.
// ---------------------------------------------------------------------------

// Supplied by the Supabase edge runtime; absent under `functions serve`,
// which is why every use is guarded.
declare const EdgeRuntime:
  | { waitUntil(promise: Promise<unknown>): void }
  | undefined;

import nodemailer from "npm:nodemailer@6.9.7";
import { createClient } from "npm:@supabase/supabase-js@2.89.0";

// --- config ---------------------------------------------------------------

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") ?? "587");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") ?? "";

// Where internal notifications go. Comma-separated for multiple recipients.
const NOTIFY_TO = Deno.env.get("LEADS_NOTIFICATION_EMAIL") ?? "";
const NOTIFY_CC = Deno.env.get("LEADS_NOTIFICATION_CC") ?? "";

// Shared secret the database trigger sends as x-webhook-secret.
const WEBHOOK_SECRET = Deno.env.get("MARKETING_WEBHOOK_SECRET") ?? "";

const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const FROM_NAME = "Secure Place to Work";

// Brand, matching the site and the portal.
const NAVY = "#001D49";
const ORANGE = "#FF5F15";

// --- helpers --------------------------------------------------------------

/**
 * Escape user-supplied text before it goes into an HTML email.
 *
 * Every value in these payloads originates from a public web form, so it is
 * untrusted. Interpolating it raw lets a submitter inject markup or a
 * misleading link into an email that arrives looking like it came from us.
 */
function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrap(title: string, inner: string, footer: string): string {
  return `
  <div style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; color: #1a2536; max-width: 620px; margin: 0 auto; border: 1px solid #e3eaf3; border-radius: 8px; overflow: hidden;">
    <div style="background-color: ${NAVY}; padding: 24px 28px;">
      <div style="color: #ffffff; font-size: 19px; font-weight: 700; letter-spacing: -0.2px;">${esc(title)}</div>
      <div style="height: 3px; width: 40px; background-color: ${ORANGE}; margin-top: 10px;"></div>
    </div>
    <div style="padding: 26px 28px; background-color: #ffffff; font-size: 15px; line-height: 1.6;">
      ${inner}
    </div>
    <div style="padding: 16px 28px; background-color: #f4f7fb; color: #5b6b84; font-size: 12px; border-top: 1px solid #e3eaf3;">
      ${footer}
    </div>
  </div>`;
}

function row(label: string, value: string, raw = false): string {
  if (!value) return "";
  return `<p style="margin: 0 0 10px;"><strong style="color:${NAVY};">${esc(label)}:</strong> ${raw ? value : esc(value)}</p>`;
}

function block(label: string, text: string): string {
  if (!text) return "";
  return `
    <div style="margin-top: 18px; padding: 14px 16px; background-color: #f7f9fc; border-left: 3px solid ${ORANGE};">
      <strong style="color:${NAVY};">${esc(label)}</strong>
      <p style="white-space: pre-wrap; margin: 8px 0 0;">${esc(text)}</p>
    </div>`;
}

function mailto(email: string): string {
  return `<a href="mailto:${esc(email)}" style="color:${ORANGE};">${esc(email)}</a>`;
}

const SOURCE_LABELS: Record<string, string> = {
  contact: "Contact form",
  demo: "Demo request",
  secure_score: "Secure Score assessment",
  guide_download: "Guide download",
  workshop: "Workshop enquiry",
  certification: "Certification enquiry",
  other: "Other",
};

const BAND_LABELS: Record<string, string> = {
  certification_ready: "Certification ready",
  certifiable: "Certifiable",
  developing: "Developing",
  at_risk: "At risk",
};

const BAND_COLORS: Record<string, string> = {
  certification_ready: "#0E7C61",
  certifiable: "#0E7C61",
  developing: "#B4690E",
  at_risk: "#B42318",
};

const PILLAR_LABELS: Record<string, string> = {
  emergency: "Emergency preparedness",
  reporting: "Speak-up & reporting",
  training: "Training & awareness",
  drills: "Drills & response readiness",
  compliance: "Compliance & governance",
};

function pillarTable(scores: Record<string, number>): string {
  const rows = Object.entries(scores)
    .map(([key, value]) => {
      const pct = Math.max(0, Math.min(100, Number(value) || 0));
      return `
        <tr>
          <td style="padding: 7px 0; font-size: 14px;">${esc(PILLAR_LABELS[key] ?? key)}</td>
          <td style="padding: 7px 0; width: 130px;">
            <div style="background:#e9eef5; height:8px; border-radius:1px;">
              <div style="background:${ORANGE}; width:${pct}%; height:8px; border-radius:1px;"></div>
            </div>
          </td>
          <td style="padding: 7px 0 7px 12px; font-size: 14px; font-weight: 600; text-align: right; width: 44px;">${pct}</td>
        </tr>`;
    })
    .join("");
  return `<table style="width:100%; border-collapse:collapse; margin-top:6px;">${rows}</table>`;
}

// --- message builders -----------------------------------------------------

type Mail = { subject: string; html: string };

function internalLeadMail(r: Record<string, any>): Mail {
  const sourceLabel = SOURCE_LABELS[r.source] ?? String(r.source ?? "Unknown");
  const utm = r.utm && typeof r.utm === "object" && Object.keys(r.utm).length
    ? Object.entries(r.utm).map(([k, v]) => `${k}=${v}`).join(" · ")
    : "";

  const inner = `
    ${row("Name", r.name)}
    ${row("Email", mailto(r.email), true)}
    ${row("Company", r.company)}
    ${row("Phone", r.phone)}
    ${row("Job title", r.job_title)}
    ${row("Source", sourceLabel)}
    ${row("Page / asset", r.source_ref)}
    ${row("Campaign", utm)}
    ${block("Message", r.message ?? "")}
    ${PORTAL_URL ? `<p style="margin-top:22px;"><a href="${esc(PORTAL_URL)}/website/leads" style="background:${ORANGE}; color:#fff; padding:11px 20px; border-radius:999px; text-decoration:none; font-size:14px; font-weight:600; display:inline-block;">Open in portal</a></p>` : ""}
  `;

  return {
    subject: `New lead — ${r.name ?? "Unknown"}${r.company ? ` (${r.company})` : ""} · ${sourceLabel}`,
    html: wrap("New website lead", inner, "Received via the Secure Place to Work website."),
  };
}

function ackLeadMail(r: Record<string, any>): Mail {
  const inner = `
    <p style="margin:0 0 14px;">Hello ${esc(r.name ?? "there")},</p>
    <p style="margin:0 0 14px;">Thank you for getting in touch with Secure Place to Work. Your enquiry has reached our team and someone will reply within one working day.</p>
    ${r.message ? block("What you sent us", r.message) : ""}
    ${SITE_URL ? `<p style="margin-top:20px;">In the meantime you may find our <a href="${esc(SITE_URL)}/resources" style="color:${ORANGE};">resources</a> and <a href="${esc(SITE_URL)}/workshops" style="color:${ORANGE};">workshop catalogue</a> useful.</p>` : ""}
    <p style="margin-top:20px;">— The Secure Place to Work team</p>
  `;
  return {
    subject: "We have your enquiry — Secure Place to Work",
    html: wrap("Thanks for getting in touch", inner, "This is an automated acknowledgement. Reply to this email to reach a person."),
  };
}

function internalAssessmentMail(r: Record<string, any>, lead: Record<string, any> | null): Mail {
  const band = String(r.band ?? "");
  const scores = (r.pillar_scores ?? {}) as Record<string, number>;

  const inner = `
    <div style="text-align:center; padding: 6px 0 18px;">
      <div style="font-size: 46px; font-weight: 800; color:${BAND_COLORS[band] ?? NAVY}; line-height:1;">${esc(r.total_score)}<span style="font-size:20px; color:#8b9ab0;">/100</span></div>
      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color:${BAND_COLORS[band] ?? NAVY}; margin-top:6px;">${esc(BAND_LABELS[band] ?? band)}</div>
    </div>
    ${row("Company", r.company)}
    ${row("Industry", r.industry)}
    ${row("Workforce", r.employee_band)}
    ${row("Sites", r.site_count ? String(r.site_count) : "")}
    ${lead?.email ? row("Contact", `${esc(lead.name ?? "")} — ${mailto(lead.email)}`, true) : `<p style="margin:0 0 10px; color:#8b9ab0;">No contact details captured — the visitor did not complete the email gate.</p>`}
    <div style="margin-top:20px;">
      <strong style="color:${NAVY};">Pillar breakdown</strong>
      ${pillarTable(scores)}
    </div>
    ${PORTAL_URL ? `<p style="margin-top:22px;"><a href="${esc(PORTAL_URL)}/website/assessments" style="background:${ORANGE}; color:#fff; padding:11px 20px; border-radius:999px; text-decoration:none; font-size:14px; font-weight:600; display:inline-block;">Review submission</a></p>` : ""}
  `;

  return {
    subject: `Secure Score ${r.total_score}/100 — ${r.company ?? "Unknown company"} (${BAND_LABELS[band] ?? band})`,
    html: wrap("Secure Score submitted", inner, "Received via the Secure Score assessment."),
  };
}

function ackAssessmentMail(r: Record<string, any>, lead: Record<string, any> | null): Mail {
  const band = String(r.band ?? "");
  const scores = (r.pillar_scores ?? {}) as Record<string, number>;

  const inner = `
    <p style="margin:0 0 16px;">Hello ${esc(lead?.name ?? "there")},</p>
    <p style="margin:0 0 18px;">Here is your Secure Score, based on the answers you gave.</p>
    <div style="text-align:center; padding: 14px 0 20px; background:#f7f9fc; border-radius:6px;">
      <div style="font-size: 52px; font-weight: 800; color:${BAND_COLORS[band] ?? NAVY}; line-height:1;">${esc(r.total_score)}<span style="font-size:22px; color:#8b9ab0;">/100</span></div>
      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color:${BAND_COLORS[band] ?? NAVY}; margin-top:8px;">${esc(BAND_LABELS[band] ?? band)}</div>
    </div>
    <div style="margin-top:22px;">
      <strong style="color:${NAVY};">How you scored across the five pillars</strong>
      ${pillarTable(scores)}
    </div>
    <p style="margin-top:22px; font-size:13px; color:#5b6b84; padding:12px 14px; background:#f7f9fc; border-left:3px solid ${NAVY};">
      This self-assessment is indicative. It is not a Secure Place certification, which is awarded only after an audited survey of your workplace.
    </p>
    ${SITE_URL ? `<p style="margin-top:20px;"><a href="${esc(SITE_URL)}/certification" style="background:${ORANGE}; color:#fff; padding:11px 20px; border-radius:999px; text-decoration:none; font-size:14px; font-weight:600; display:inline-block;">See what certification involves</a></p>` : ""}
    <p style="margin-top:22px;">— The Secure Place to Work team</p>
  `;

  return {
    subject: `Your Secure Score: ${r.total_score}/100`,
    html: wrap("Your Secure Score", inner, "You received this because you completed the assessment on our website."),
  };
}

async function registrationMails(
  r: Record<string, any>,
  db: ReturnType<typeof createClient> | null,
): Promise<{ internal: Mail; ack: Mail }> {
  let workshopTitle = "a workshop";
  let startsAt = "";
  let location = "";

  if (db && r.session_id) {
    const { data } = await db
      .schema("marketing")
      .from("workshop_sessions")
      .select("starts_at, location, timezone, workshops(title)")
      .eq("id", r.session_id)
      .maybeSingle();

    if (data) {
      const w = (data as any).workshops;
      workshopTitle = (Array.isArray(w) ? w[0]?.title : w?.title) ?? workshopTitle;
      location = (data as any).location ?? "";
      if ((data as any).starts_at) {
        startsAt = new Date((data as any).starts_at).toLocaleString("en-IN", {
          dateStyle: "full",
          timeStyle: "short",
          timeZone: (data as any).timezone ?? "Asia/Kolkata",
        });
      }
    }
  }

  const internal = {
    subject: `Workshop registration — ${r.name ?? "Unknown"} · ${workshopTitle}`,
    html: wrap("New workshop registration", `
      ${row("Workshop", workshopTitle)}
      ${row("Session", startsAt)}
      ${row("Location", location)}
      ${row("Name", r.name)}
      ${row("Email", mailto(r.email), true)}
      ${row("Company", r.company)}
      ${row("Phone", r.phone)}
      ${row("Seats", r.seats ? String(r.seats) : "1")}
      ${block("Notes", r.notes ?? "")}
      ${PORTAL_URL ? `<p style="margin-top:22px;"><a href="${esc(PORTAL_URL)}/website/workshops" style="background:${ORANGE}; color:#fff; padding:11px 20px; border-radius:999px; text-decoration:none; font-size:14px; font-weight:600; display:inline-block;">Open in portal</a></p>` : ""}
    `, "Received via the Secure Place to Work website."),
  };

  const ack = {
    subject: `You're registered — ${workshopTitle}`,
    html: wrap("Registration confirmed", `
      <p style="margin:0 0 14px;">Hello ${esc(r.name ?? "there")},</p>
      <p style="margin:0 0 16px;">Your place on <strong>${esc(workshopTitle)}</strong> is confirmed.</p>
      ${row("When", startsAt)}
      ${row("Where", location)}
      ${row("Seats reserved", r.seats ? String(r.seats) : "1")}
      <p style="margin-top:20px;">We will be in touch with joining details closer to the date. Reply to this email if anything changes at your end.</p>
      <p style="margin-top:20px;">— The Secure Place to Work team</p>
    `, "This is an automated confirmation. Reply to this email to reach a person."),
  };

  return { internal, ack };
}

// --- handler --------------------------------------------------------------

Deno.serve(async (req: Request) => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    // The function is deployed with --no-verify-jwt so the database trigger can
    // reach it, which means this check is the only thing standing between the
    // public internet and our SMTP credentials. Fail closed if it is unset.
    if (!WEBHOOK_SECRET) {
      console.error("MARKETING_WEBHOOK_SECRET is not set — refusing to run.");
      return json({ error: "Function is not configured" }, 503);
    }
    if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
      console.warn("Rejected webhook call with a bad or missing secret.");
      return json({ error: "Unauthorized" }, 401);
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !NOTIFY_TO) {
      console.error("SMTP configuration incomplete.");
      return json({ error: "Email is not configured" }, 503);
    }

    const payload = await req.json();
    const { schema, table, record } = payload ?? {};

    if (schema !== "marketing") {
      return json({ error: `Unexpected schema: ${schema}` }, 400);
    }
    if (!record) {
      return json({ error: "No record in payload" }, 400);
    }

    // Everything above this line is validation and answers synchronously, so a
    // bad secret or an unknown table still gets a proper status code.
    //
    // Everything below is the slow part — two SMTP round trips, each with a
    // handshake, TLS and auth. Doing that before responding made the caller
    // wait ~5s and pg_net gave up on it:
    //   "Timeout of 5000 ms reached ... HTTP Request/Response time: 4901ms"
    //
    // A webhook's job is to acknowledge receipt, not to block on delivery, so
    // the work is handed to the runtime and we answer 202 straight away.
    const work = deliver(table, record);

    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(work);
    } else {
      // Local `supabase functions serve` has no waitUntil; await so the task
      // is not killed when the response is returned.
      await work;
    }

    return json({ accepted: true, table }, 202);
  } catch (error) {
    console.error("marketing-lead-notification failed:", error);
    return json({ error: (error as Error).message }, 500);
  }
});

/**
 * Builds and sends both emails. Runs after the response has been returned, so
 * nothing here can affect the caller's status code — failures are logged.
 */
async function deliver(table: string, record: Record<string, any>) {
  try {
    const db = SUPABASE_URL && SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

    let internal: Mail;
    let ack: Mail | null = null;
    let ackTo: string | null = null;

    switch (table) {
      case "leads": {
        internal = internalLeadMail(record);
        // Downloads and score submissions get their own acknowledgement from
        // the flow that produced them; a second generic one would be noise.
        if (record.source !== "guide_download" && record.source !== "secure_score") {
          ack = ackLeadMail(record);
          ackTo = record.email ?? null;
        }
        break;
      }

      case "assessments": {
        let lead: Record<string, any> | null = null;
        if (db && record.lead_id) {
          const { data } = await db
            .schema("marketing")
            .from("leads")
            .select("name, email")
            .eq("id", record.lead_id)
            .maybeSingle();
          lead = data as Record<string, any> | null;
        }
        internal = internalAssessmentMail(record, lead);
        // Phase 03 will attach the generated PDF report here. Until then the
        // score and pillar breakdown go inline, which is the part that matters.
        if (lead?.email) {
          ack = ackAssessmentMail(record, lead);
          ackTo = lead.email;
        }
        break;
      }

      case "workshop_registrations": {
        const mails = await registrationMails(record, db);
        internal = mails.internal;
        ack = mails.ack;
        ackTo = record.email ?? null;
        break;
      }

      default:
        console.warn(`Unhandled table: ${table}`);
        return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // implicit TLS on 465, STARTTLS otherwise
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });

    const from = `"${FROM_NAME}" <${SMTP_USER}>`;

    // The internal notification is the one that must not be lost. Both are
    // awaited here, but nothing they do can change the caller's status code
    // any more — the 202 has already gone back. Failures are logged only.
    const info = await transporter.sendMail({
      from,
      to: NOTIFY_TO,
      ...(NOTIFY_CC ? { cc: NOTIFY_CC } : {}),
      replyTo: record.email || undefined,
      subject: internal.subject,
      html: internal.html,
    });

    let ackId: string | null = null;
    if (ack && ackTo) {
      try {
        const ackInfo = await transporter.sendMail({
          from,
          to: ackTo,
          subject: ack.subject,
          html: ack.html,
        });
        ackId = ackInfo.messageId ?? null;
      } catch (err) {
        console.error("Acknowledgement failed (notification already sent):", err);
      }
    }

    console.log(
      `Notified on ${table}: ${record.email ?? record.id} ` +
        `(internal=${info.messageId ?? "?"}, ack=${ackId ?? "none"})`,
    );
  } catch (error) {
    // Nothing to report to the caller at this point; the webhook already
    // returned 202. Surfaces in the function logs.
    console.error("marketing-lead-notification delivery failed:", error);
  }
}
