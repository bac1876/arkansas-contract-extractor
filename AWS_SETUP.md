# AWS SES Email Processing Setup

## Overview
This guide sets up AWS SES to receive emails, store them in S3, and trigger a Lambda function that sends PDFs to your extraction API.

## Architecture
```
Email → SES → S3 → Lambda → Your API Server → Google Drive
```

## Step 1: Domain Verification in SES

1. Go to AWS SES Console
2. Navigate to "Verified identities"
3. Click "Create identity"
4. Choose "Domain"
5. Enter your domain (e.g., `contractextraction.com`)
6. Add the DNS records shown to your domain provider

## Step 2: Create S3 Bucket

```bash
# Create bucket for storing emails
aws s3 mb s3://arkansas-contracts-inbox

# Create folder structure
aws s3api put-object --bucket arkansas-contracts-inbox --key inbox/
aws s3api put-object --bucket arkansas-contracts-inbox --key processed/
aws s3api put-object --bucket arkansas-contracts-inbox --key errors/
```

## Step 3: Set Up SES Receipt Rule

1. In SES Console, go to "Email receiving"
2. Create a rule set (if none exists)
3. Create a new rule:
   - **Recipients**: `contracts@yourdomain.com` (or catch-all)
   - **Actions**: 
     - Store in S3 bucket: `arkansas-contracts-inbox`
     - Object key prefix: `inbox/`

## Step 4: Deploy Lambda Function

### 4.1 Prepare Lambda deployment package

```bash
cd lambda
npm install
zip -r function.zip .
```

### 4.2 Create Lambda function

```bash
aws lambda create-function \
  --function-name arkansas-contract-processor \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler email-processor.handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables={EXTRACTION_ENDPOINT=https://your-app.com/api/process-contract,API_KEY=your-secret-key}
```

### 4.3 Add S3 trigger

```bash
aws lambda add-permission \
  --function-name arkansas-contract-processor \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::arkansas-contracts-inbox/*

aws s3api put-bucket-notification-configuration \
  --bucket arkansas-contracts-inbox \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "Id": "ProcessNewEmails",
      "LambdaFunctionArn": "arn:aws:lambda:REGION:ACCOUNT:function:arkansas-contract-processor",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [{
            "Name": "prefix",
            "Value": "inbox/"
          }]
        }
      }
    }]
  }'
```

## Step 5: Create IAM Role for Lambda

Create a role with these policies:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::arkansas-contracts-inbox/*"
    }
  ]
}
```

## Step 6: Update MX Records

Point your domain's MX records to SES:

```
Priority: 10
Value: inbound-smtp.us-east-1.amazonaws.com
```

(Replace region as needed)

## Step 7: Deploy Your API Server

### 7.1 Set environment variables

Create `.env` file:
```
PORT=3000
API_KEY=your-secret-key-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service@account.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
OPENAI_API_KEY=your-openai-key
```

### 7.2 Start the server

```bash
npm install
npm run build
npm start
```

Or with PM2 for production:

```bash
pm2 start api-server.js --name arkansas-contracts
pm2 save
pm2 startup
```

## Step 8: Test the Setup

1. Send a test email with PDF attachment to `contracts@yourdomain.com`
2. Check CloudWatch logs for Lambda execution
3. Check your API server logs
4. Verify documents appear in Google Drive

## Monitoring

### CloudWatch Dashboard

Create alarms for:
- Lambda errors
- Lambda duration > 30s
- S3 PUT events
- API server health checks

### Logs to check:
- Lambda: `/aws/lambda/arkansas-contract-processor`
- API Server: Your server logs
- SES: CloudWatch Logs for bounce/complaint notifications

## Cost Estimate

- **SES Inbound**: $0.10 per 1,000 emails
- **S3 Storage**: ~$0.023 per GB per month
- **Lambda**: 
  - First 1M requests free
  - $0.20 per 1M requests after
  - Compute: $0.0000166667 per GB-second
- **Total**: Less than $1/month for typical usage (100 emails/day)

## Troubleshooting

### Email not received
- Check SES receipt rules are active
- Verify MX records with: `nslookup -type=mx yourdomain.com`
- Check SES Console for suppression list

### Lambda not triggering
- Check S3 bucket notification configuration
- Verify Lambda permissions
- Check CloudWatch logs

### API not receiving data
- Verify EXTRACTION_ENDPOINT in Lambda environment
- Check API_KEY matches
- Test with curl:
```bash
curl -X POST https://your-api.com/api/process-contract \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.pdf","content":"base64..."}'
```

## Security Notes

1. **API Key**: Use AWS Secrets Manager for production
2. **Network**: Put Lambda in VPC if accessing private resources
3. **S3**: Enable versioning and lifecycle policies
4. **Monitoring**: Set up AWS GuardDuty for threat detection