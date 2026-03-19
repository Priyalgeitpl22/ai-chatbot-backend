/**
 * ZeptoMail (Zoho) transactional email API.
 * @see https://www.npmjs.com/package/zeptomail
 * @see https://www.zoho.com/zeptomail/help/api/email-sending.html
 */

const ZEPTOMAIL_URL = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.in/v1.1/email";
const ZEPTOMAIL_TOKEN = process.env.ZEPTOMAIL_TOKEN || "";

let _client: any = null;

function getClient() {
  if (!ZEPTOMAIL_TOKEN) {
    throw new Error("ZEPTOMAIL_TOKEN environment variable is required");
  }
  if (!_client) {
    const { SendMailClient } = require("zeptomail");
    _client = new SendMailClient({ url: ZEPTOMAIL_URL, token: ZEPTOMAIL_TOKEN });
  }
  return _client;
}

export function isZeptoMailConfigured(): boolean {
  return Boolean(ZEPTOMAIL_TOKEN?.trim());
}

export interface ZeptoMailOptions {
  from: { address: string; name?: string };
  to: { address: string; name?: string } | Array<{ email_address: { address: string; name?: string } }>;
  subject: string;
  htmlbody?: string;
  textbody?: string;
}

/**
 * Send a single email via ZeptoMail API.
 */
export async function sendZeptoMail(options: ZeptoMailOptions): Promise<void> {
  const client = getClient();
  const toList = Array.isArray(options.to)
    ? options.to
    : [{ email_address: { address: options.to.address, name: options.to.name } }];
  await client.sendMail({
    from: {
      address: options.from.address,
      name: options.from.name || options.from.address,
    },
    to: toList,
    subject: options.subject,
    ...(options.htmlbody && { htmlbody: options.htmlbody }),
    ...(options.textbody && { textbody: options.textbody }),
  });
}
