import { CronJob } from 'cron';
import { emailReplyMonitor } from './emailReplyMonitor';

class EmailReplyCronService {
  private cronJob: CronJob | null = null;
  private isRunning = false;

  constructor() {
    this.initializeCronJob();
  }

  private initializeCronJob(): void {
    // Run every 5 minutes to check for email replies
    // You can adjust this interval as needed
    const cronExpression = '*/1 * * * *'; // Every 5 minutes
    
    this.cronJob = new CronJob(
      cronExpression,
      async () => {
        if (this.isRunning) {
          return;
        }

        this.isRunning = true;
        
        try {
          await emailReplyMonitor.processEmailReplies();
        } catch (error) {
          console.error('Error during email reply check:', error);
        } finally {
          this.isRunning = false;
        }
      },
      null, // onComplete
      true, // start immediately
      'UTC' // timezone
    );
  }

  start(): void {
    if (this.cronJob && !this.cronJob.running) {
      this.cronJob.start();
      console.log('Email reply cron job started');
    }
  }

  stop(): void {
    if (this.cronJob && this.cronJob.running) {
      this.cronJob.stop();
      console.log('Email reply cron job stopped');
    }
  }

  isJobRunning(): boolean {
    return this.cronJob ? this.cronJob.running : false;
  }

  getStatus(): { running: boolean; isProcessing: boolean } {
    return {
      running: this.isJobRunning(),
      isProcessing: this.isRunning
    };
  }
}

// Export singleton instance
export const emailReplyCronService = new EmailReplyCronService();
