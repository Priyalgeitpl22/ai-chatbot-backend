import Imap from 'imap';
// @ts-ignore - mailparser types not available
import { simpleParser, ParsedMail } from 'mailparser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  imapHost?: string;
  imapPort?: number;
  imapSecure?: boolean;
}

interface EmailReply {
  threadId: string;
  content: string;
  sender: string;
  subject: string;
  date: Date;
  messageId: string;
}

export class EmailReplyMonitor {
  private imap: Imap | null = null;
  private isConnected = false;
  private processedEmails = new Set<string>();

  constructor() {
    // Initialize with empty set for processed emails
  }

  private validateEmailConfig(emailConfig: any): emailConfig is EmailConfig {
    if (!emailConfig || typeof emailConfig !== 'object') {
      return false;
    }

    // Check required fields
    if (!emailConfig.host || !emailConfig.user || !emailConfig.pass) {
      return false;
    }

    // Validate host format
    const host = emailConfig.host.toLowerCase();
    if (!host.includes('.') || host.length < 3) {
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailConfig.user)) {
      return false;
    }

    // Validate port if provided (handle both string and number)
    if (emailConfig.port) {
      const port = typeof emailConfig.port === 'string' ? parseInt(emailConfig.port, 10) : emailConfig.port;
      if (isNaN(port) || port < 1 || port > 65535) {
        return false;
      }
    }

    return true;
  }

  private mapToImapConfig(emailConfig: EmailConfig): any {
    const host = emailConfig.imapHost || emailConfig.host;
    
    // Map SMTP settings to IMAP settings for different providers
    if (host.includes('gmail.com') || host.includes('googlemail.com')) {
      return {
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        user: emailConfig.user,
        password: emailConfig.pass
      };
    } else if (host.includes('outlook.com') || host.includes('hotmail.com') || host.includes('live.com')) {
      return {
        host: 'outlook.office365.com',
        port: 993,
        tls: true,
        user: emailConfig.user,
        password: emailConfig.pass
      };
    } else if (host.includes('yahoo.com')) {
      return {
        host: 'imap.mail.yahoo.com',
        port: 993,
        tls: true,
        user: emailConfig.user,
        password: emailConfig.pass
      };
    } else {
      // For custom IMAP servers, use the provided config or defaults
      const port = emailConfig.imapPort || emailConfig.port || 993;
      return {
        host: emailConfig.imapHost || emailConfig.host,
        port: typeof port === 'string' ? parseInt(port, 10) : port,
        tls: emailConfig.imapSecure !== false,
        user: emailConfig.user,
        password: emailConfig.pass
      };
    }
  }

  private getTlsOptions(emailConfig: EmailConfig): any {
    const host = emailConfig.imapHost || emailConfig.host;
    
    // Gmail IMAP specific TLS configuration
    if (host.includes('gmail.com') || host.includes('googlemail.com')) {
      return {
        rejectUnauthorized: true,
        servername: 'imap.gmail.com',
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384',
        honorCipherOrder: true,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      };
    } else if (host.includes('outlook.com') || host.includes('hotmail.com') || host.includes('live.com')) {
      return {
        rejectUnauthorized: true,
        servername: 'outlook.office365.com',
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384',
        honorCipherOrder: true,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      };
    } else if (host.includes('yahoo.com')) {
      return {
        rejectUnauthorized: true,
        servername: 'imap.mail.yahoo.com',
        ciphers: 'ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384',
        honorCipherOrder: true,
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3'
      };
    }

    // Default TLS options for other providers
    return {
      rejectUnauthorized: false,
      ciphers: 'HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
      minVersion: 'TLSv1.2'
    };
  }

  async connectToEmail(emailConfig: EmailConfig, retryCount = 0): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        // Disconnect any existing connection
        if (this.imap && this.isConnected) {
          this.disconnect();
        }

        // Map SMTP config to IMAP config for Gmail
        const imapConfig = this.mapToImapConfig(emailConfig);
        console.log("connectToEmail", imapConfig);
        
        this.imap = new Imap({
          host: imapConfig.host,
          port: imapConfig.port,
          tls: imapConfig.tls,
          user: imapConfig.user,
          password: imapConfig.password,
          tlsOptions: this.getTlsOptions(emailConfig),
          connTimeout: 60000,
          authTimeout: 30000,
          keepalive: {
            interval: 10000,
            idleInterval: 300000,
            forceNoop: true
          }
        });

        this.imap.once('ready', () => {
          console.log('IMAP connection established');
          this.isConnected = true;
          resolve(true);
        });

        this.imap.once('error', async (err: Error) => {
          console.error('IMAP connection error:', err);
          this.isConnected = false;
          
          // Retry connection up to 3 times with exponential backoff
          if (retryCount < 3) {
            console.log(`Retrying connection in ${Math.pow(2, retryCount) * 1000}ms... (attempt ${retryCount + 1}/3)`);
            setTimeout(async () => {
              try {
                const result = await this.connectToEmail(emailConfig, retryCount + 1);
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, Math.pow(2, retryCount) * 1000);
          } else {
            reject(err);
          }
        });

        this.imap.once('end', () => {
          console.log('IMAP connection ended');
          this.isConnected = false;
        });

        this.imap.connect();
      } catch (error) {
        console.error('Error creating IMAP connection:', error);
        reject(error);
      }
    });
  }

  async checkForReplies(emailConfig: EmailConfig): Promise<EmailReply[]> {
    console.log("checkForReplies", emailConfig);
    if (!this.isConnected || !this.imap) {
      await this.connectToEmail(emailConfig);
    }

    return new Promise((resolve, reject) => {
      console.log("checkForReplies", this.imap);
      if (!this.imap) {
        reject(new Error('IMAP not connected'));
        return;
      }

      this.imap.openBox('INBOX', false, (err, box) => {
        console.log("checkForReplies", box);
        if (err) {
          console.error('Error opening inbox:', err);
          reject(err);
          return;
        }

        // Search for emails from the last 24 hours (both read and unread)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const searchCriteria = [
          ['SINCE', yesterday]
        ];

        this.imap!.search(searchCriteria, (err, results) => {
          console.log("checkForReplies", results);
          if (err) {
            console.log("checkForReplies", err);
            console.error('Error searching emails:', err);
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            console.log("checkForReplies", results);
            resolve([]);
            return;
          }

          // Fetch emails
          const fetch = this.imap!.fetch(results, { bodies: '' });
          console.log("checkForReplies", fetch);
          const emails: EmailReply[] = [];

          fetch.on('message', (msg, seqno) => {
            console.log("checkForReplies", msg);
            let buffer = '';

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
                console.log("checkForReplies", chunk);
                buffer += chunk.toString('utf8');
              });
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(buffer);
                const emailReply = await this.parseEmailReply(parsed);
                if (emailReply) {
                  emails.push(emailReply);
                }
              } catch (parseErr) {
                console.error('Error parsing email:', parseErr);
              }
            });
          });

          fetch.once('error', (err) => {
            console.error('Error fetching emails:', err);
            reject(err);
          });

          fetch.once('end', () => {
            resolve(emails);
          });
        });
      });
    });
  }

  private async parseEmailReply(parsed: ParsedMail): Promise<EmailReply | null> {
    try {
      const subject = parsed.subject || '';
      const from = parsed.from?.text || '';
      const content = this.extractTextContent(parsed.text || parsed.html || '');
      const messageId = parsed.messageId || '';

      console.log("parsed", parsed);
      // Extract thread ID from subject or email headers
      const threadId = this.extractThreadId(subject, parsed.headers);
      
      if (!threadId) {
        console.log('No thread ID found in email:', subject);
        return null;
      }

      // Check if this email was already processed
      if (this.processedEmails.has(messageId)) {
        return null;
      }

      // Mark as processed
      this.processedEmails.add(messageId);

      return {
        threadId,
        content,
        sender: from,
        subject,
        date: parsed.date || new Date(),
        messageId
      };
    } catch (error) {
      console.error('Error parsing email reply:', error);
      return null;
    }
  }

  private extractThreadId(subject: string, headers: any): string | null {
    // Method 1: Look for thread ID in subject (e.g., "Re: [ThreadID: abc123] Original Subject")
    const subjectMatch = subject.match(/\[ThreadID:\s*([a-f0-9-]+)\]/i);
    if (subjectMatch) {
      return subjectMatch[1];
    }

    // Method 2: Look for thread ID in email headers
    const inReplyTo = headers.get('in-reply-to');
    const references = headers.get('references');
    
    if (inReplyTo) {
      const threadMatch = inReplyTo.match(/thread-([a-f0-9-]+)@/i);
      if (threadMatch) {
        return threadMatch[1];
      }
    }

    if (references) {
      const threadMatch = references.match(/thread-([a-f0-9-]+)@/i);
      if (threadMatch) {
        return threadMatch[1];
      }
    }

    // Method 3: Look for thread ID in custom headers
    const customThreadId = headers.get('x-thread-id');
    if (customThreadId) {
      return customThreadId;
    }

    // Method 4: Look for thread ID in Message-ID header
    const messageId = headers.get('message-id');
    if (messageId) {
      const threadMatch = messageId.match(/thread-([a-f0-9-]+)@/i);
      if (threadMatch) {
        return threadMatch[1];
      }
    }

    // Method 5: Try to extract from Reply-To header
    const replyTo = headers.get('reply-to');
    if (replyTo) {
      const threadMatch = replyTo.match(/thread-([a-f0-9-]+)@/i);
      if (threadMatch) {
        return threadMatch[1];
      }
    }

    // Method 6: Look for any UUID pattern in subject (fallback)
    const uuidMatch = subject.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch) {
      return uuidMatch[1];
    }

    return null;
  }

  private extractTextContent(content: string): string {
    // Remove HTML tags and clean up the text
    const textContent = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    // Remove common email reply patterns
    const cleanedContent = textContent
      .replace(/^On .+ wrote:$/gm, '') // Remove "On ... wrote:" lines
      .replace(/^From: .+$/gm, '') // Remove "From:" lines
      .replace(/^Sent: .+$/gm, '') // Remove "Sent:" lines
      .replace(/^To: .+$/gm, '') // Remove "To:" lines
      .replace(/^Subject: .+$/gm, '') // Remove "Subject:" lines
      .replace(/^Date: .+$/gm, '') // Remove "Date:" lines
      .replace(/^>.*$/gm, '') // Remove quoted lines starting with >
      .replace(/\n\s*\n/g, '\n') // Remove multiple empty lines
      .trim();

    return cleanedContent;
  }

  async processEmailReplies(): Promise<void> {
    try {
      // Get all organizations with email config
      const organizations = await prisma.organization.findMany({
        where: {
          emailConfig: {
            not: null
          } as any
        },
        select: {
          id: true,
          aiOrgId: true,
          emailConfig: true
        }
      });

      console.log(`Found ${organizations.length} organizations with email config`);
      for (const org of organizations) {
        if (!org.emailConfig) continue;

        try {
          const emailConfig = org.emailConfig as unknown as EmailConfig;
          console.log("emailConfig", emailConfig);
          
          // Validate email configuration
          if (!this.validateEmailConfig(emailConfig)) {
            console.error(`Invalid email configuration for org ${org.id}:`, emailConfig);
            continue;
          }

          const replies = await this.checkForReplies(emailConfig);

          for (const reply of replies) {
            await this.addReplyToThread(reply, org.aiOrgId || 0);
          }
        } catch (error) {
          console.error(`Error processing emails for org ${org.id}:`, error);
          
          // If it's an SSL error, try to disconnect and reconnect
          if (error instanceof Error && error.message.includes('SSL')) {
            console.log(`SSL error detected for org ${org.id}, disconnecting...`);
            this.disconnect();
          }
        }
      }
    } catch (error) {
      console.error('Error processing email replies:', error);
    }
  }

  private async addReplyToThread(reply: EmailReply, aiOrgId: number): Promise<void> {
    try {
      // Find the thread
      const thread = await prisma.thread.findFirst({
        where: {
          id: reply.threadId,
          aiOrgId: aiOrgId
        }
      });

      if (!thread) {
        console.log(`Thread ${reply.threadId} not found for org ${aiOrgId}`);
        return;
      }

      // Add the reply as a message to the thread
      await prisma.message.create({
        data: {
          content: reply.content,
          sender: reply.sender,
          threadId: reply.threadId,
          seen: false
        }
      });

      // Update thread's last activity
      await prisma.thread.update({
        where: { id: reply.threadId },
        data: { 
          lastActivityAt: new Date(),
          readed: false
        }
      });

      console.log(`Added reply to thread ${reply.threadId} from ${reply.sender}`);
    } catch (error) {
      console.error(`Error adding reply to thread ${reply.threadId}:`, error);
    }
  }

  disconnect(): void {
    if (this.imap && this.isConnected) {
      this.imap.end();
      this.isConnected = false;
    }
  }
}

// Export a singleton instance
export const emailReplyMonitor = new EmailReplyMonitor();
