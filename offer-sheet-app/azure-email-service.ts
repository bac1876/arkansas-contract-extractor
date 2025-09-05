/**
 * Azure Email Service
 * Sends formatted offer sheets via Azure (SendGrid or Communication Services)
 */

import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { loadEmailConfig } from './config/email-config';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface OfferSheetEmail {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  attachments: EmailAttachment[];
}

export class AzureEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config = loadEmailConfig();
  
  constructor() {
    this.initializeTransporter();
  }
  
  private initializeTransporter() {
    // Using SendGrid via SMTP (most common Azure email solution)
    if (this.config.azure.sendgrid?.apiKey) {
      console.log('📧 Initializing SendGrid email service...');
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: this.config.azure.sendgrid.apiKey
        }
      });
    } 
    // Fallback to standard SMTP if SendGrid not configured
    else {
      console.log('📧 Using standard SMTP configuration...');
      
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.config.incoming.user,
          pass: this.config.incoming.password
        }
      });
    }
  }
  
  /**
   * Send an offer sheet email with the original contract attached
   */
  async sendOfferSheet(email: OfferSheetEmail): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }
    
    try {
      const fromEmail = this.config.azure.sendgrid?.fromEmail || this.config.incoming.user;
      const fromName = this.config.azure.sendgrid?.fromName || 'Arkansas Contract Agent';
      
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${fromName}" <${fromEmail}>`,
        to: email.to,
        subject: email.subject,
        text: email.textContent,
        html: email.htmlContent,
        attachments: email.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType
        }))
      };
      
      console.log(`📤 Sending offer sheet to: ${email.to}`);
      console.log(`📎 Attachments: ${email.attachments.map(a => a.filename).join(', ')}`);
      
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('✅ Offer sheet sent successfully');
      console.log('Message ID:', info.messageId);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error sending offer sheet:', error);
      return false;
    }
  }
  
  /**
   * Send a response email for an extracted contract
   */
  async sendContractOfferSheet(
    recipientEmail: string,
    contractPath: string,
    htmlContent: string,
    textContent: string,
    propertyAddress?: string
  ): Promise<boolean> {
    
    // Read the contract file
    const contractBuffer = await fs.promises.readFile(contractPath);
    const contractFilename = path.basename(contractPath);
    
    // Prepare the email
    const email: OfferSheetEmail = {
      to: recipientEmail,
      subject: propertyAddress ? `Offer ${propertyAddress}` : `Offer ${contractFilename.replace('.pdf', '')}`,
      htmlContent,
      textContent,
      attachments: [{
        filename: contractFilename,
        content: contractBuffer,
        contentType: 'application/pdf'
      }]
    };
    
    return await this.sendOfferSheet(email);
  }
  
  /**
   * Test the email configuration
   */
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Email transporter not initialized');
      return false;
    }
    
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}