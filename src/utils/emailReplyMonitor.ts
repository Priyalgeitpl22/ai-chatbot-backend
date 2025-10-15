import Imap from 'imap';
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

  async connectToEmail(emailConfig: EmailConfig): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.imap = new Imap({
          host: emailConfig.imapHost || emailConfig.host,
          port: emailConfig.imapPort || emailConfig.port || 993,
          tls: emailConfig.imapSecure !== false,
          user: emailConfig.user,
          password: emailConfig.pass,
          tlsOptions: { rejectUnauthorized: false }
        });

        this.imap.once('ready', () => {
          console.log('IMAP connection established');
          this.isConnected = true;
          resolve(true);
        });

        this.imap.once('error', (err: Error) => {
          console.error('IMAP connection error:', err);
          this.isConnected = false;
          reject(err);
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
    if (!this.isConnected || !this.imap) {
      await this.connectToEmail(emailConfig);
    }

    return new Promise((resolve, reject) => {
      if (!this.imap) {
        reject(new Error('IMAP not connected'));
        return;
      }

      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('Error opening inbox:', err);
          reject(err);
          return;
        }

        // Search for unread emails from the last 24 hours
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const searchCriteria = [
          'UNSEEN',
          ['SINCE', yesterday]
        ];

        this.imap!.search(searchCriteria, (err, results) => {
          if (err) {
            console.error('Error searching emails:', err);
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            resolve([]);
            return;
          }

          // Fetch emails
          const fetch = this.imap!.fetch(results, { bodies: '' });
          const emails: EmailReply[] = [];

          fetch.on('message', (msg, seqno) => {
            let buffer = '';

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => {
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
          }
        },
        select: {
          id: true,
          aiOrgId: true,
          emailConfig: true
        }
      });

      for (const org of organizations) {
        if (!org.emailConfig) continue;

        try {
          const emailConfig = org.emailConfig as EmailConfig;
          const replies = await this.checkForReplies(emailConfig);

          for (const reply of replies) {
            await this.addReplyToThread(reply, org.aiOrgId || 0);
          }
        } catch (error) {
          console.error(`Error processing emails for org ${org.id}:`, error);
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
