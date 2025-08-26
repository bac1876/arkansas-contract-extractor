# Enable Domain-Wide Delegation for Arkansas Contract Agent

Since brian@searchnwa.com is a Google Workspace account, you can enable domain-wide delegation to fix the storage issue.

## Steps to Enable (Admin Access Required)

1. **Go to Google Admin Console**
   - Visit: https://admin.google.com
   - Sign in with brian@searchnwa.com (must have admin privileges)

2. **Navigate to Security Settings**
   - Click on **Security** → **Access and data control** → **API controls**
   - Click on **MANAGE DOMAIN-WIDE DELEGATION**

3. **Add Service Account**
   - Click **Add new**
   - Enter these details:
     - **Client ID**: `114298874995431452633`
     - **OAuth Scopes** (enter both, one per line):
       ```
       https://www.googleapis.com/auth/drive
       https://www.googleapis.com/auth/spreadsheets
       ```
   - Click **Authorize**

4. **Wait for Propagation**
   - Changes may take up to 24 hours to fully propagate
   - Usually works within 5-15 minutes

## What This Does

- Allows the service account to act as brian@searchnwa.com
- Files created will be owned by brian@searchnwa.com
- Uses brian's storage quota (which should have plenty of space)
- No more "storageQuotaExceeded" errors

## Alternative: Create a Shared Drive

If you can't access the Admin Console, you can create a Shared Drive instead:

1. Go to https://drive.google.com
2. Click "Shared drives" in the left sidebar
3. Click "New" to create a shared drive
4. Name it "Arkansas Contract Data"
5. Add arkansas-contract-agent@arkansas-contract-agent.iam.gserviceaccount.com as a member with "Content Manager" role
6. Update the .env file with the new Shared Drive ID

Shared Drives have these benefits:
- Files don't count against any individual's quota
- Service accounts can create files directly
- Better for team collaboration