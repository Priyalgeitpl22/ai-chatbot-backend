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
          this.isConnected = true;
          resolve(true);
        });

        this.imap.once('error', async (err: Error) => {
          console.error('IMAP connection error:', err);
          this.isConnected = false;
          
          // Retry connection up to 3 times with exponential backoff
          if (retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000;
            setTimeout(async () => {
              try {
                const result = await this.connectToEmail(emailConfig, retryCount + 1);
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, delay);
          } else {
            reject(err);
          }
        });

        this.imap.once('end', () => {
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

        // Search for emails from the last 24 hours (both read and unread)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const searchCriteria = [
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
          let totalMessages = results.length;
          let completedMessages = 0;

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
                  console.log(`Found email reply from ${emailReply.sender} for thread ${emailReply.threadId}`);
                }
              } catch (parseErr) {
                console.error(`Error parsing email ${seqno}:`, parseErr);
              } finally {
                completedMessages++;
                
                // Check if all messages have been processed
                if (completedMessages === totalMessages) {
                  console.log(`Processed ${completedMessages} emails, found ${emails.length} replies`);
                  resolve(emails);
                }
              }
            });
          });

          fetch.once('error', (err) => {
            console.error('Error fetching emails:', err);
            reject(err);
          });

          fetch.once('end', () => {
            // Don't resolve here - wait for all individual message processing to complete
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

      const threadId = this.extractThreadId(subject, parsed.headers);
      
      if (!threadId) {
        return null;
      }

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
    // Helper function to safely extract string from header value
    const getHeaderString = (headerValue: any): string | null => {
      if (!headerValue) return null;
      
      if (typeof headerValue === 'string') {
        return headerValue;
      }
      
      if (Array.isArray(headerValue)) {
        return headerValue[0] || null;
      }
      
      if (typeof headerValue === 'object') {
        return headerValue.text || headerValue.value || String(headerValue);
      }
      
      return String(headerValue);
    };

    // Method 1: Look for thread ID in subject (e.g., "Re: [ThreadID: abc123] Original Subject")
    const subjectMatch = subject.match(/\[ThreadID:\s*([a-f0-9-]+)\]/i);
    if (subjectMatch) {
      return subjectMatch[1];
    }

    // Method 2: Look for thread ID in email headers
    const inReplyTo = getHeaderString(headers.get('in-reply-to'));
    if (inReplyTo) {
      const threadMatch = inReplyTo.match(/thread-([a-f0-9-]+)@/i);
      if (threadMatch) {
        return threadMatch[1];
      }
    }

    const references = getHeaderString(headers.get('references'));
    if (references) {
      const threadMatch = references.match(/thread-([a-f0-9-]+)@/i);
      if (threadMatch) {
        return threadMatch[1];
      }
    }

    // Method 3: Look for thread ID in custom headers
    const customThreadId = getHeaderString(headers.get('x-thread-id'));
    if (customThreadId) {
      return customThreadId;
    }

    // Method 4: Look for thread ID in Message-ID header
    const messageId = getHeaderString(headers.get('message-id'));
    if (messageId) {
      const threadMatch = messageId.match(/thread-([a-f0-9-]+)@/i);
      if (threadMatch) {
        return threadMatch[1];
      }
    }

    // Method 5: Try to extract from Reply-To header
    const replyTo = getHeaderString(headers.get('reply-to'));
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
    let textContent = content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    // Split by common email reply separators to get the actual reply
    const replySeparators = [
      /On .+ wrote:/gi,
      /From: .+$/gm,
      /Sent: .+$/gm,
      /To: .+$/gm,
      /Subject: .+$/gm,
      /Date: .+$/gm,
      /^>.*$/gm, // Quoted lines starting with >
      /Best Regards.*$/gmi,
      /Sincerely.*$/gmi,
      /Thanks.*$/gmi,
      /Regards.*$/gmi
    ];

    // Find the first occurrence of any separator
    let earliestMatch = textContent.length;
    let separatorFound = false;

    for (const separator of replySeparators) {
      const match = textContent.search(separator);
      if (match !== -1 && match < earliestMatch) {
        earliestMatch = match;
        separatorFound = true;
      }
    }

    // If we found a separator, extract only the content before it
    if (separatorFound) {
      textContent = textContent.substring(0, earliestMatch).trim();
    }

    // Additional cleanup
    textContent = textContent
      .replace(/^\s*[-=*_]{3,}.*$/gm, '') // Remove separator lines
      .replace(/^\s*$/, '') // Remove empty lines at start
      .replace(/\n\s*\n/g, '\n') // Remove multiple empty lines
      .trim();

    return textContent;
  }

  async debugEmailReplies(orgId?: string): Promise<void> {
    try {
      let organizations;
      
      if (orgId) {
        // Debug specific organization
        const org = await prisma.organization.findUnique({
          where: { id: orgId },
          select: {
            id: true,
            aiOrgId: true,
            emailConfig: true
          }
        });
        
        if (!org || !org.emailConfig) {
          console.log(`Organization ${orgId} not found or has no email config`);
          return;
        }
        
        organizations = [org];
      } else {
        // Debug all organizations
        organizations = await prisma.organization.findMany({
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
      }

      console.log(`Found ${organizations.length} organizations with email config`);
      
      for (const org of organizations) {
        if (!org.emailConfig) continue;

        try {
          const emailConfig = org.emailConfig as unknown as EmailConfig;
          
          // Validate email configuration
          if (!this.validateEmailConfig(emailConfig)) {
            console.error(`Invalid email configuration for org ${org.id}:`, emailConfig);
            continue;
          }

          console.log(`Testing email connection for org ${org.id} (${emailConfig.user})`);
          const testResult = await this.testEmailConnection(emailConfig);

          if (!testResult.success) {
            console.error(`Email connection test failed for org ${org.id}:`, testResult.error);
            continue;
          }

          console.log("Email connection test passed, checking for replies...");
          const replies = await this.checkForReplies(emailConfig);
          console.log("Got replies:", replies);

          for (const reply of replies) {
            console.log("Adding reply to thread:", reply);
            await this.addReplyToThread(reply, org.aiOrgId || 0);
          }
        } catch (error) {
          console.error(`Error processing emails for org ${org.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in debug email replies:', error);
    }
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
          
          // Validate email configuration
          if (!this.validateEmailConfig(emailConfig)) {
            console.error(`Invalid email configuration for org ${org.id}:`, emailConfig);
            continue;
          }

          const replies = await this.checkForReplies(emailConfig);
          console.log("Got replies", replies);

          for (const reply of replies) {
            console.log("adding reply to thread", reply);
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

  async testEmailConnection(emailConfig: EmailConfig): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      // Test connection
      const connected = await this.connectToEmail(emailConfig);
      if (!connected) {
        return { success: false, error: 'Failed to connect to email server' };
      }

      // Test inbox access
      return new Promise((resolve) => {
        if (!this.imap) {
          resolve({ success: false, error: 'IMAP not connected' });
          return;
        }

        this.imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            resolve({ 
              success: false, 
              error: 'Failed to open inbox', 
              details: { error: err.message } 
            });
            return;
          }

          // Test search with a broader date range
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          const searchCriteria = [['SINCE', weekAgo]];
          
          this.imap!.search(searchCriteria, (searchErr, results) => {
            if (searchErr) {
              resolve({ 
                success: false, 
                error: 'Failed to search emails', 
                details: { error: searchErr.message } 
              });
              return;
            }

            resolve({
              success: true,
              details: {
                totalMessages: box.messages.total,
                foundEmails: results ? results.length : 0,
                searchCriteria,
                dateRange: {
                  from: weekAgo.toISOString(),
                  to: new Date().toISOString()
                }
              }
            });
          });
        });
      });
    } catch (error) {
      console.error('Test connection error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { error }
      };
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
