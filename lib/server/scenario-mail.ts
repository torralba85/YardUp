import { createTransport } from "nodemailer";

export function scenarioMailConfigured(): boolean {
  return process.env.SCENARIO_EMAIL_ENABLED === "true" && Boolean(process.env.SCENARIO_SMTP_USER && process.env.SCENARIO_SMTP_PASSWORD_SECRET);
}

/** Existing Google Workspace mailbox. No user-supplied host, From, subject, or HTML. */
export async function sendScenarioMail(to: string, token: string): Promise<void> {
  if (!scenarioMailConfigured()) throw new Error("Scenario mail is not configured.");
  const transport = createTransport({ host: "smtp.gmail.com", port: 465, secure: true,
    connectionTimeout: 10_000, socketTimeout: 15_000,
    auth: { user: process.env.SCENARIO_SMTP_USER, pass: process.env.SCENARIO_SMTP_PASSWORD_SECRET } });
  try {
    const info = await transport.sendMail({ from: 'LotFoundry <support@lotfoundry.net>', to,
      subject: "Your LotFoundry 3D lot layout",
      text: `Open your saved 3D lot layout:\nhttps://lotfoundry.net/layout/${token}\n\nThis private link expires in 30 days. Anyone with this link can view the layout and property address; share it only with people you trust. It does not unlock a paid certificate.\n\nYou requested this one-time email. You have not been subscribed to marketing.\n\nLotFoundry · support@lotfoundry.net` });
    if (!info.accepted?.length) throw new Error("Mail server did not accept the recipient.");
  } finally { transport.close(); }
}
