const nodemailer = require("nodemailer");

const escapeHtml = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
};

const createTransporter = () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  const port = Number(SMTP_PORT);

  if (
    !SMTP_HOST ||
    !Number.isInteger(port) ||
    port <= 0 ||
    !SMTP_USER ||
    !SMTP_PASS ||
    !process.env.EMAIL_FROM
  ) {
    throw new Error("SMTP email configuration is incomplete");
  }

  const secure =
    SMTP_SECURE !== undefined
      ? SMTP_SECURE.toLowerCase() === "true"
      : port === 465;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const sendWorkspaceInvitationEmail = async ({to,inviterName,workspaceName,token,expiresAt}) => {
  const { CLIENT_URL, EMAIL_FROM } = process.env;

  if (!CLIENT_URL) {
    throw new Error("CLIENT_URL is not configured");
  }

  const baseUrl = CLIENT_URL.endsWith("/")
    ? CLIENT_URL
    : `${CLIENT_URL}/`;

  const invitationUrl = new URL(
    `invitations/${encodeURIComponent(token)}`,
    baseUrl
  ).toString();

  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeInviterName = escapeHtml(
    inviterName || "A WorkSync member"
  );

  const subjectWorkspaceName = String(workspaceName)
    .replace(/[\r\n]/g, " ")
    .trim();

  const expiryText = new Date(expiresAt).toUTCString();

  const transporter = createTransporter();

  await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject: `You're invited to ${subjectWorkspaceName} workspace on WorkSync`,
    text: [
      `${inviterName || "A WorkSync member"} invited you to join "${workspaceName}" workspace on WorkSync.`,
      "",
      `Accept your invitation: ${invitationUrl}`,
      "",
      `This invitation expires at ${expiryText}.`,
      "",
      "If you weren't expecting this invitation, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
        <h2>You're invited to WorkSync</h2>
        <p>
          <strong>${safeInviterName}</strong>
          invited you to join
          <strong>${safeWorkspaceName}</strong>.
        </p>
        <p>
          Join your team to collaborate on projects, tasks,
          comments, and activity.
        </p>

        <p style="margin: 28px 0;">
          <a href="${invitationUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 20p border-radius: 8px; font-weight: bold;">
            Accept invitation
          </a>
        </p>

        <p>
          This link expires at ${expiryText}.
        </p>

        <p style="font-size: 13px; color: #64748b;">
          If you weren't expecting this invitation, you can
          safely ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = {sendWorkspaceInvitationEmail};