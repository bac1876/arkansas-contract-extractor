# AWS SES Email Processing Solution

## Why Switch from Gmail IMAP?

The current Gmail IMAP approach has several issues:
- Emails getting marked as read unexpectedly
- Authentication problems with app passwords
- Timing delays in email detection
- Complex state management for processed emails

## AWS SES Solution Benefits

✅ **Reliable**: Direct email delivery to your infrastructure
✅ **Fast**: Instant processing via Lambda triggers  
✅ **Scalable**: Handle thousands of emails per minute
✅ **Cost-effective**: $0.10 per 1,000 emails
✅ **No authentication issues**: Emails flow directly to you

## How It Works

```
1. Client sends email → contracts@yourdomain.com
2. AWS SES receives email → Stores in S3
3. S3 triggers Lambda → Extracts PDFs
4. Lambda calls your API → Process contracts
5. Your API → Google Drive & Sheets
```

## Files Created

### 1. Lambda Function (`lambda/email-processor.js`)
- Parses emails from S3
- Extracts PDF attachments
- Sends to your API endpoint

### 2. API Server (`api-server.ts`)
- Receives PDFs from Lambda
- Runs GPT-5 extraction
- Generates net sheets
- Uploads to Google Drive
- Creates Google Sheets

### 3. Setup Guide (`AWS_SETUP.md`)
- Complete AWS configuration steps
- DNS setup instructions
- Security best practices

## Quick Start

1. **Verify your domain in AWS SES**
2. **Create S3 bucket** for email storage
3. **Deploy Lambda** function
4. **Start API server**: `npm run api`
5. **Update MX records** to point to SES

## Costs

- **Monthly estimate**: < $1 for 100 emails/day
- **No Gmail limits or quotas**
- **Pay only for what you use**

## Migration Path

1. Keep Gmail IMAP running during transition
2. Set up AWS SES in parallel
3. Test with a subdomain first (e.g., `aws.contractextraction.com`)
4. Switch MX records when ready
5. Decommission IMAP monitor

This approach eliminates all the email processing issues and provides a production-ready, scalable solution.