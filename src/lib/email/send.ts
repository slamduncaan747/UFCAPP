import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] No RESEND_API_KEY set, skipping:", subject, "to", to);
    return;
  }
  await resend.emails.send({
    from: "Fantasy UFC <noreply@fantasymma.app>",
    to,
    subject,
    html,
  });
}

export async function sendDraftStartingEmail(to: string, leagueName: string, leagueId: string) {
  await sendEmail({
    to,
    subject: `Draft starting now — ${leagueName}`,
    html: `
      <div style="font-family: sans-serif; background: #0a0b0d; color: #f0f2f5; padding: 32px; border-radius: 12px;">
        <h1 style="color: #2e8bff; margin: 0 0 16px;">⚡ Draft Starting!</h1>
        <p>The snake draft for <strong>${leagueName}</strong> is starting now.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/leagues/${leagueId}/draft"
           style="display: inline-block; background: #2e8bff; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">
          Enter Draft Room
        </a>
      </div>
    `,
  });
}

export async function sendLockReminderEmail(to: string, eventName: string, lockTime: Date) {
  await sendEmail({
    to,
    subject: `🔒 Roster locks soon — ${eventName}`,
    html: `
      <div style="font-family: sans-serif; background: #0a0b0d; color: #f0f2f5; padding: 32px; border-radius: 12px;">
        <h1 style="color: #f5b014; margin: 0 0 16px;">⏰ Roster Lock Reminder</h1>
        <p>Rosters for <strong>${eventName}</strong> lock at ${lockTime.toLocaleString()}.</p>
        <p>Make any last-minute add/drops before the event starts!</p>
      </div>
    `,
  });
}
