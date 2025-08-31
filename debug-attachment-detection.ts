/**
 * Debug script to test attachment detection in emails
 * This will help us understand why Railway isn't finding PDF attachments
 */

const Imap = require('imap');
const { simpleParser } = require('mailparser');
import * as dotenv from 'dotenv';

dotenv.config();

interface AttachmentDebugInfo {
  filename: string;
  contentType: string;
  size: number;
  contentDisposition?: string;
  contentId?: string;
  headers?: any;
}

class AttachmentDebugger {
  private imap: any;

  constructor() {
    // Initialize IMAP connection
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const email = process.env.EMAIL_USER || 'offers@searchnwa.com';
      const password = process.env.EMAIL_PASSWORD;

      if (!password) {
        reject(new Error('Email password not found'));
        return;
      }

      console.log('🔐 Connecting to email server for debugging...');
      console.log(`   Email: ${email}`);

      this.imap = new Imap({
        user: email,
        password: password,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
        debug: (info: string) => {
          // Only log connection-related debug info
          if (info.includes('CAPABILITY') || info.includes('LOGIN') || info.includes('SELECT')) {
            console.log(`DEBUG: ${info}`);
          }
        }
      });

      this.imap.once('ready', () => {
        console.log('✅ Connected successfully');
        resolve(true);
      });

      this.imap.once('error', reject);
      this.imap.connect();
    });
  }

  async debugRecentAttachments() {
    return new Promise((resolve) => {
      this.imap.openBox('INBOX', false, (err: Error, box: any) => {
        if (err) {
          console.error('❌ Error opening inbox:', err);
          resolve([]);
          return;
        }

        console.log(`📬 Inbox contains ${box.messages.total} total messages`);
        
        // Get the last 5 emails to check for attachments
        const fetch = this.imap.seq.fetch(`${Math.max(1, box.messages.total - 4)}:*`, {
          bodies: '',
          struct: true
        });

        const debugResults: any[] = [];
        let processedCount = 0;

        fetch.on('message', (msg: any, seqno: number) => {
          console.log(`\n📧 Processing message ${seqno}...`);

          msg.on('body', (stream: any) => {
            simpleParser(stream, (parseErr: Error, parsed: any) => {
              if (parseErr) {
                console.error('❌ Parse error:', parseErr);
                processedCount++;
                return;
              }

              const messageInfo = {
                seqno: seqno,
                from: parsed.from?.text || 'Unknown',
                subject: parsed.subject || 'No Subject',
                date: parsed.date,
                hasAttachments: !!(parsed.attachments && parsed.attachments.length > 0),
                attachmentCount: parsed.attachments ? parsed.attachments.length : 0,
                attachments: [] as AttachmentDebugInfo[]
              };

              console.log(`📨 From: ${messageInfo.from}`);
              console.log(`📋 Subject: ${messageInfo.subject}`);
              console.log(`📅 Date: ${messageInfo.date}`);
              console.log(`📎 Has attachments: ${messageInfo.hasAttachments}`);

              if (parsed.attachments && parsed.attachments.length > 0) {
                console.log(`📎 Found ${parsed.attachments.length} attachment(s):`);
                
                parsed.attachments.forEach((attachment: any, index: number) => {
                  const attachInfo: AttachmentDebugInfo = {
                    filename: attachment.filename || `attachment_${index}`,
                    contentType: attachment.contentType || 'unknown',
                    size: attachment.size || 0,
                    contentDisposition: attachment.contentDisposition,
                    contentId: attachment.contentId,
                    headers: attachment.headers
                  };

                  console.log(`   ${index + 1}. ${attachInfo.filename}`);
                  console.log(`      Content-Type: ${attachInfo.contentType}`);
                  console.log(`      Size: ${attachInfo.size} bytes`);
                  console.log(`      Content-Disposition: ${attachInfo.contentDisposition || 'N/A'}`);
                  
                  // Check if this would be detected as a PDF
                  const isPDF = attachInfo.contentType === 'application/pdf';
                  console.log(`      🔍 Would be detected as PDF: ${isPDF ? '✅ YES' : '❌ NO'}`);
                  
                  if (!isPDF && attachInfo.contentType.includes('pdf')) {
                    console.log(`      ⚠️  Contains 'pdf' but not exact match: ${attachInfo.contentType}`);
                  }

                  messageInfo.attachments.push(attachInfo);
                });
              } else {
                console.log('📭 No attachments found - this would trigger "No PDF attachments found" message');
              }

              debugResults.push(messageInfo);
              processedCount++;
              
              console.log('-'.repeat(80));
            });
          });
        });

        fetch.once('end', () => {
          console.log(`\n📊 Debugging complete - processed ${processedCount} messages`);
          
          // Summary
          const totalAttachments = debugResults.reduce((sum, msg) => sum + msg.attachmentCount, 0);
          const messagesWithAttachments = debugResults.filter(msg => msg.hasAttachments).length;
          const pdfAttachments = debugResults.reduce((sum, msg) => 
            sum + msg.attachments.filter(att => att.contentType === 'application/pdf').length, 0);
          
          console.log(`\n📈 SUMMARY:`);
          console.log(`   Messages checked: ${debugResults.length}`);
          console.log(`   Messages with attachments: ${messagesWithAttachments}`);
          console.log(`   Total attachments: ${totalAttachments}`);
          console.log(`   PDF attachments (exact match): ${pdfAttachments}`);
          
          // Look for potential issues
          const nonPdfAttachments = debugResults.reduce((acc, msg) => {
            msg.attachments.forEach(att => {
              if (att.contentType !== 'application/pdf' && att.filename?.toLowerCase().includes('.pdf')) {
                acc.push(`${att.filename} - ${att.contentType}`);
              }
            });
            return acc;
          }, [] as string[]);
          
          if (nonPdfAttachments.length > 0) {
            console.log(`\n⚠️  POTENTIAL ISSUES - PDF files with wrong content type:`);
            nonPdfAttachments.forEach(issue => console.log(`   ${issue}`));
          }

          resolve(debugResults);
        });

        fetch.once('error', (fetchErr: Error) => {
          console.error('❌ Fetch error:', fetchErr);
          resolve([]);
        });
      });
    });
  }

  disconnect() {
    if (this.imap) {
      this.imap.end();
    }
  }
}

// Run the debugger
if (require.main === module) {
  const debugTool = new AttachmentDebugger();
  
  debugTool.connect()
    .then(() => {
      return debugTool.debugRecentAttachments();
    })
    .then((results) => {
      console.log('\n🎯 Debug session completed');
      debugTool.disconnect();
    })
    .catch((error) => {
      console.error('❌ Debug session failed:', error);
      debugTool.disconnect();
    });
}

export default AttachmentDebugger;