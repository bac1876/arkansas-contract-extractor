/**
 * Email Configuration for Offer Sheet App
 * Handles both incoming email monitoring and Azure email sending
 */

export interface EmailConfig {
  // Incoming email configuration (IMAP)
  incoming: {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    tlsOptions?: {
      rejectUnauthorized: boolean;
    };
  };
  
  // Azure email configuration
  azure: {
    // Using SendGrid via Azure (most common Azure email service)
    sendgrid?: {
      apiKey: string;
      fromEmail: string;
      fromName: string;
    };
    // Or Azure Communication Services
    communicationServices?: {
      connectionString: string;
      fromEmail: string;
    };
  };
  
  // Processing settings
  processing: {
    checkIntervalMinutes: number;
    processedEmailsFile: string;
    attachmentsDir: string;
  };
}

// Load configuration from environment variables
export function loadEmailConfig(): EmailConfig {
  return {
    incoming: {
      user: process.env.OFFER_SHEET_EMAIL || 'contractextraction@gmail.com',
      password: process.env.OFFER_SHEET_PASSWORD || '',
      host: process.env.OFFER_SHEET_HOST || 'imap.gmail.com',
      port: parseInt(process.env.OFFER_SHEET_PORT || '993'),
      tls: true,
      tlsOptions: {
        rejectUnauthorized: false
      }
    },
    
    azure: {
      // Default to SendGrid (most common with Azure)
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'contractextraction@gmail.com',
        fromName: process.env.SENDGRID_FROM_NAME || 'Arkansas Contract Agent - Offer Sheet'
      }
    },
    
    processing: {
      checkIntervalMinutes: 5,
      processedEmailsFile: 'offer-sheet-app/processed-offer-sheets.json',
      attachmentsDir: 'offer-sheet-app/attachments'
    }
  };
}