Resolving "403 Forbidden" Errors for Google Sheets API Service Accounts: An Exhaustive Technical Analysis and Implementation GuideSection 1: Deconstructing the "403 Forbidden" ErrorThe 403 Forbidden error, accompanied by the message "The caller does not have permission," is a frequent and often perplexing obstacle for developers attempting to use Google Cloud Platform (GCP) service accounts to create resources within Google Workspace, such as a new Google Sheet. This error is not an indication of a failed authentication; rather, it signals a failure in authorization. The system successfully identifies the service account making the request but determines that this identity lacks the necessary permissions to perform the specified action. This issue has been widely reported by developers who find that their previously functional code suddenly stops working or that their initial setup fails despite following standard documentation.1The resolution to this error requires a nuanced understanding of the distinct architectural and security boundaries between Google Cloud Platform and Google Workspace. The error is a direct symptom of a GCP-native principal—the service account—attempting to operate within the separate domain of Google Workspace without being explicitly granted an identity and the corresponding permissions within that domain's context. This report will dissect the root causes of this authorization failure and provide two comprehensive, production-ready solution paths, complete with detailed implementation guides and security best practices.1.1 The Anatomy of the ErrorWhen an application using a service account attempts to create a new spreadsheet via the Google Sheets API, it may receive the following JSON response:JSON{
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED"
  }
}
This response signifies that the request was successfully received and authenticated by Google's servers, but the action was blocked at the authorization stage. The PERMISSION_DENIED status explicitly points to a permissions-related issue. The core of the problem is that the service account, despite potentially having powerful roles within its GCP project, is not recognized as having the right to create a file in the target Google Drive location. This is a common point of confusion, as developers often assume that project-level permissions in GCP should translate directly to capabilities within the Google APIs they enable.1 The error persists even after regenerating keys or creating new service accounts, which underscores that the issue lies in the configuration of permissions, not the credentials themselves.21.2 The "Two Sovereigns" Insight: GCP vs. Google WorkspaceThe fundamental reason for the 403 error is the architectural separation between Google Cloud Platform and Google Workspace (which encompasses Google Drive and Google Sheets). These two platforms operate as distinct security domains, or "sovereigns," each with its own native identity and access management system.Google Cloud Platform (GCP): In this domain, the primary identity and access management framework is IAM (Identity and Access Management). A service account is a first-class principal within GCP IAM. It is an identity that can be granted roles (e.g., Project Editor, Service Account User) which confer permissions to use GCP resources and make authorized API calls.4Google Workspace: This domain, which includes user-centric services like Google Drive, Docs, and Sheets, uses a different permission model based on user accounts and sharing. Resources like files and folders are controlled by Access Control Lists (ACLs) that specify which users (identified by email addresses) or groups have what level of access (e.g., Viewer, Commenter, Editor).5A service account is created and managed within GCP. From the perspective of Google Drive, a service account is not an internal principal with inherent rights. Instead, it is treated as an external user, identified by its unique email address (e.g., my-service-account@my-project.iam.gserviceaccount.com). Consequently, granting a service account the Project > Owner role in GCP has no effect on its ability to create a file in a specific user's Google Drive. The service account must be explicitly invited and granted permissions within the Google Drive ecosystem, just like any human collaborator.6 The Google Sheets API call to create a new sheet is, under the hood, a request to create a file in Google Drive. If the service account has not been granted Editor rights on the destination location (typically a folder), Google Drive's authorization system correctly denies the request, resulting in the 403 Forbidden error. This is reinforced by the fact that service accounts cannot own Google Workspace assets like documents directly; they can only create them within a context where they have been granted permission, such as a shared drive or a folder shared with them.41.3 Authentication vs. Authorization: A Critical DistinctionTo effectively troubleshoot this error, it is vital to distinguish between authentication and authorization.Authentication is the process of proving identity. When an application uses a service account's JSON key file, it is authenticating itself to Google's OAuth 2.0 infrastructure. The cryptographic signature on the JSON Web Token (JWT) proves that the request originates from the holder of the private key associated with that service account.8 The 403 error does not mean authentication has failed; Google knows precisely which service account is making the call.Authorization is the process of determining if an authenticated identity has permission to perform a specific action on a specific resource. This is where the failure occurs. After the service account is successfully authenticated, the Google Drive backend checks its ACLs for the target location (e.g., a user's root Drive folder or a specific subfolder). Since the service account has not been granted explicit permission on that resource, the authorization check fails, and the API returns PERMISSION_DENIED.1This distinction explains why using a simple API key is insufficient. API keys are designed for accessing public data and do not carry an authenticated identity, whereas service accounts and OAuth 2.0 are used for authenticated access to private user or application data.6 The problem is not about accessing the API in general, but about having the specific right to create a file in a protected user space.Section 2: The Triad of Permissions: A Unified Access Control ModelTo successfully authorize a service account to create a Google Sheet, a developer must correctly configure three distinct layers of permissions. This "Triad of Permissions" model provides a systematic framework for ensuring that access is granted at the project level, the API level, and the resource level. Failure to configure any one of these layers will result in the 403 Forbidden error.2.1 Layer 1: Google Cloud Project IAM RolesThe first layer of permissions resides within the Google Cloud Platform's IAM system. These roles grant the service account the fundamental ability to interact with Google Cloud services and make API calls from the project.Function of IAM Roles: IAM roles define what actions a principal (like a service account) can perform on GCP resources. For the purpose of calling Google APIs, the service account needs a role that allows it to function as an identity and utilize the enabled APIs within the project.4Required Roles: While roles like Project > Owner or Project > Editor are commonly used during development and will suffice, they are overly permissive for production environments.11 In a production setting, a more granular role should be used, adhering to the principle of least privilege. For scenarios involving impersonation (covered in Section 4), the Service Account User role (roles/iam.serviceAccountUser) is essential, as it allows a principal to run operations as the service account.4Necessary but Insufficient: It is crucial to understand that these GCP IAM roles are a prerequisite but are not sufficient on their own. They authorize the service account to use the Google Sheets and Drive APIs, but they do not grant any permissions over the specific user-owned files and folders within Google Drive that the APIs will interact with.2.2 Layer 2: API Enablement and OAuth 2.0 ScopesThe second layer involves enabling the correct APIs and specifying the appropriate authorization scopes in the application's code. This layer defines the contract between the application and Google, outlining what categories of data the application wishes to access.The API DualityA common oversight is failing to enable all necessary APIs. Creating a Google Sheet is an operation that involves two distinct APIs:Google Sheets API: This API is used to interact with the spreadsheet's content and properties, such as setting the title, adding worksheets, or writing cell data.12Google Drive API: This API is responsible for the underlying file management. Since a Google Sheet is a file stored in Google Drive, the act of creating a new sheet is fundamentally a file creation operation managed by the Drive API.14Therefore, for a service account to successfully create a new Google Sheet, both the Google Sheets API and the Google Drive API must be enabled in the Google Cloud project. Numerous tutorials and guides confirm that enabling both is a mandatory step.10 This can be done through the Google Cloud Console's "APIs & Services" library or via the gcloud command-line tool.21Essential OAuth 2.0 ScopesIn addition to enabling the APIs, the application must request the correct OAuth 2.0 scopes during the authentication flow. Scopes are strings that define the extent of access the application is requesting. For creating and managing Google Sheets, a combination of scopes from both the Sheets and Drive APIs is required.The following table details the essential scopes and their justification.ScopeJustificationRequired ForSource Referencehttps://www.googleapis.com/auth/spreadsheetsGrants full permission to create, read, and write spreadsheet data and properties. This is the primary scope for interacting with the Sheets API.Creating the spreadsheet object, defining its initial properties (like the title), and performing subsequent read/write operations on the sheet's content.10https://www.googleapis.com/auth/driveGrants full permission to see, edit, create, and delete all of a user's Google Drive files. This broad scope is required because creating a new Sheet is fundamentally a file creation operation within Google Drive.Physically creating the file in Drive, placing it in a folder, setting its ownership, and managing its permissions.10https://www.googleapis.com/auth/drive.fileA more restrictive alternative to .../auth/drive. It grants permission to see, edit, create, and delete only the specific Google Drive files that the application creates or opens.Creating the file and managing it thereafter, without granting the application access to the user's entire Drive. This is the recommended scope for enhanced security.24Requesting these scopes in the application's authentication code is a critical step in the authorization process.82.3 Layer 3: Resource-Based Permissions (Google Drive)This third and final layer is the most frequently overlooked and is the direct cause of the 403 Forbidden error in most cases. It involves granting the service account permissions on the specific resource within Google Drive where the new sheet is to be created.As established, Google Drive uses its own ACL-based sharing model, which is entirely separate from GCP IAM.5 To authorize the service account, it must be treated like a human collaborator:Identity: The service account is identified by its unique client_email found in the downloaded JSON key file.6Permission Grant: This service account email must be explicitly granted Editor (or Writer) permissions on the target location. Viewer or Commenter roles are insufficient for creating new files.5Target Location: For the specific task of creating a new sheet, the service account needs permission to write to a container. This means a parent folder in Google Drive must be shared with the service account's email address. Simply sharing an existing spreadsheet is not enough to grant permission to create a new one in the same location. The permission must be on the folder itself.16By correctly configuring all three layers—GCP IAM roles, API enablement with proper scopes, and resource-based permissions in Google Drive—a developer can establish a complete and valid authorization chain, thereby resolving the 403 Forbidden error.Section 3: Primary Solution Path: The Shared Folder MethodThe most direct and common method for resolving the 403 Forbidden error is the "Shared Folder" method. This approach treats the service account as an independent, non-human collaborator. By creating a dedicated folder in Google Drive and sharing it with the service account, a secure and isolated workspace is established where the application can programmatically create and manage files. This method does not require special administrative privileges within Google Workspace and can be implemented entirely by a developer with access to a Google Cloud project and a Google Drive account.3.1 Step 1: Google Cloud Project ConfigurationThis initial phase involves setting up the necessary components within the Google Cloud Platform. This process should be followed meticulously to ensure the service account is correctly configured.Create a Google Cloud Project: If one does not already exist, create a new project in the Google Cloud Console.11 This project will house the service account and manage API billing and quotas.Enable Required APIs: Navigate to the "APIs & Services > Library" section of the project. Search for and enable the following two APIs. This is a critical step, as both are required for the operation 22:Google Sheets API (sheets.googleapis.com) 13Google Drive API (drive.googleapis.com) 10Create a Service Account:Navigate to "APIs & Services > Credentials".Click "Create Credentials" and select "Service Account".27Provide a descriptive name for the service account (e.g., sheets-creator-bot).Grant the service account a project role. For development, Project > Editor is sufficient. For production, a more restrictive custom role is recommended.11 Click "Done".Generate and Secure a JSON Key:From the "Credentials" page, click on the newly created service account.Navigate to the "Keys" tab.Click "Add Key" and select "Create new key".Choose JSON as the key type and click "Create".27A JSON file containing the service account's private key and other credentials will be downloaded to the local machine. This file is highly sensitive and must be stored securely. It should never be committed to public or private source control repositories.7Open the downloaded JSON file and locate the client_email field. Copy this email address (e.g., sheets-creator-bot@your-project-id.iam.gserviceaccount.com). This is the identity of the service account within the Google Workspace ecosystem.3.2 Step 2: Google Drive PreparationThis phase involves creating the designated workspace within Google Drive and granting the service account access to it.Create a Destination Folder: In your Google Drive (drive.google.com), create a new folder. This folder will serve as the parent directory for all spreadsheets created by the service account. For example, name it "Automated Reports".Share the Folder with the Service Account:Right-click the newly created folder and select "Share".16In the sharing dialog box, paste the client_email of the service account that was copied from the JSON key file.7In the dropdown menu next to the email address, assign the role of Editor. This is the crucial step that grants the service account the permission to create, edit, and delete files within this specific folder.5 The Viewer or Commenter roles will not be sufficient and will still result in a 403 error when attempting to create a file.Uncheck the "Notify people" box, as the service account does not have an inbox, and click "Share".16Obtain the Folder ID: Open the shared folder in your browser. The URL will be in the format https://drive.google.com/drive/folders/FOLDER_ID. Copy the FOLDER_ID part of the URL. This ID will be required in the application code to specify where the new spreadsheet should be created.3.3 Step 3: Code ImplementationThe final step is to write the application code that uses the service account credentials to create a new spreadsheet inside the designated shared folder. The most robust way to achieve this is by using the Google Drive API to explicitly create the file with the correct MIME type and parent folder, ensuring precise control over its location.25Python Example (google-api-python-client)This example demonstrates authenticating with the service account and using the Drive API v3 to create a new spreadsheet in the specified folder.Pythonimport os.path
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# --- Configuration ---
# Path to your service account key file
SERVICE_ACCOUNT_FILE = 'path/to/your/service_account_key.json'
# ID of the Google Drive folder shared with the service account
PARENT_FOLDER_ID = 'YOUR_SHARED_FOLDER_ID'
# Scopes required for the operation. Both Drive and Sheets scopes are necessary.
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

def create_sheet_in_folder(title):
    """Creates a new Google Sheet in a specific Drive folder using a service account."""
    creds = None
    try:
        creds = Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    except FileNotFoundError:
        print(f"Error: Service account key file not found at '{SERVICE_ACCOUNT_FILE}'")
        return None
    except Exception as e:
        print(f"Error loading credentials: {e}")
        return None

    try:
        # Build the Drive API service
        drive_service = build('drive', 'v3', credentials=creds)
        
        # Define the metadata for the new spreadsheet file
        file_metadata = {
            'name': title,
            'parents':,
            'mimeType': 'application/vnd.google-apps.spreadsheet'
        }
        
        # Create the file using the Drive API
        new_sheet_file = drive_service.files().create(
            body=file_metadata,
            fields='id, name, webViewLink'
        ).execute()
        
        spreadsheet_id = new_sheet_file.get('id')
        print(f"Successfully created spreadsheet '{new_sheet_file.get('name')}'")
        print(f"Spreadsheet ID: {spreadsheet_id}")
        print(f"URL: {new_sheet_file.get('webViewLink')}")
        
        # (Optional) You can now use the Sheets API to interact with this spreadsheet
        # sheets_service = build('sheets', 'v4', credentials=creds)
        #... perform operations using sheets_service and spreadsheet_id...
        
        return spreadsheet_id

    except HttpError as error:
        print(f"An error occurred: {error}")
        return None

if __name__ == '__main__':
    create_sheet_in_folder('My New Automated Sheet')

This code authenticates using the service account file and the necessary scopes.15 It then uses the drive.files().create() method to create a new file, explicitly setting the mimeType to identify it as a Google Sheet and the parents attribute to place it directly into the shared folder.25Node.js Example (googleapis)This example provides the equivalent functionality in a Node.js environment.JavaScriptconst { google } = require('googleapis');
const path = require('path');

// --- Configuration ---
// Path to your service account key file
const KEYFILEPATH = path.join(__dirname, 'path/to/your/service_account_key.json');
// ID of the Google Drive folder shared with the service account
const PARENT_FOLDER_ID = 'YOUR_SHARED_FOLDER_ID';
// Scopes required for the operation
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
];

async function createSheetInFolder(title) {
    try {
        // Configure the JWT auth client
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILEPATH,
            scopes: SCOPES,
        });

        // Create client instance for auth
        const client = await auth.getClient();

        // Build the Drive API service
        const drive = google.drive({ version: 'v3', auth: client });

        // Define the metadata for the new spreadsheet file
        const fileMetadata = {
            name: title,
            parents:,
            mimeType: 'application/vnd.google-apps.spreadsheet',
        };

        // Create the file using the Drive API
        const response = await drive.files.create({
            resource: fileMetadata,
            fields: 'id, name, webViewLink',
        });

        const spreadsheetId = response.data.id;
        console.log(`Successfully created spreadsheet '${response.data.name}'`);
        console.log(`Spreadsheet ID: ${spreadsheetId}`);
        console.log(`URL: ${response.data.webViewLink}`);

        // (Optional) Interact with the new sheet using the Sheets API
        // const sheets = google.sheets({ version: 'v4', auth: client });
        //... perform operations using sheets and spreadsheetId...

        return spreadsheetId;

    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        return null;
    }
}

createSheetInFolder('My New Automated Sheet (NodeJS)');
The Node.js code follows the same logic: authenticate using GoogleAuth with the key file and scopes, then use the Drive API to create the spreadsheet file within the specified parent folder.30Java Example (Google API Client Library for Java)This example shows the implementation in Java, requiring dependencies such as google-api-client and google-api-services-drive.Javaimport com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.api.services.drive.model.File;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;

import java.io.FileInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Arrays;
import java.util.List;

public class CreateSheetWithServiceAccount {

    // --- Configuration ---
    // Path to your service account key file
    private static final String SERVICE_ACCOUNT_FILE = "path/to/your/service_account_key.json";
    // ID of the Google Drive folder shared with the service account
    private static final String PARENT_FOLDER_ID = "YOUR_SHARED_FOLDER_ID";
    // Scopes required for the operation
    private static final List<String> SCOPES = Arrays.asList(
            DriveScopes.DRIVE, 
            "https://www.googleapis.com/auth/spreadsheets"
    );

    public static String createSheetInFolder(String title) throws IOException, GeneralSecurityException {
        // Load credentials from the service account key file
        GoogleCredentials credentials = GoogleCredentials.fromStream(new FileInputStream(SERVICE_ACCOUNT_FILE))
               .createScoped(SCOPES);
        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(credentials);

        // Build the Drive API service
        final NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        Drive driveService = new Drive.Builder(httpTransport, GsonFactory.getDefaultInstance(), requestInitializer)
               .setApplicationName("Java Sheets Creator")
               .build();

        // Define the metadata for the new spreadsheet file
        File fileMetadata = new File();
        fileMetadata.setName(title);
        fileMetadata.setParents(Collections.singletonList(PARENT_FOLDER_ID));
        fileMetadata.setMimeType("application/vnd.google-apps.spreadsheet");

        try {
            // Create the file using the Drive API
            File newSheetFile = driveService.files().create(fileMetadata)
                   .setFields("id, name, webViewLink")
                   .execute();

            String spreadsheetId = newSheetFile.getId();
            System.out.println("Successfully created spreadsheet '" + newSheetFile.getName() + "'");
            System.out.println("Spreadsheet ID: " + spreadsheetId);
            System.out.println("URL: " + newSheetFile.getWebViewLink());

            // (Optional) Interact with the new sheet using the Sheets API
            //...

            return spreadsheetId;
        } catch (IOException e) {
            System.err.println("An error occurred: " + e);
            return null;
        }
    }

    public static void main(String args) {
        try {
            createSheetInFolder("My New Automated Sheet (Java)");
        } catch (IOException | GeneralSecurityException e) {
            e.printStackTrace();
        }
    }
}
The Java implementation mirrors the logic of the Python and Node.js examples, using GoogleCredentials for authentication and the Drive service object to execute the file creation request.32Section 4: Advanced Solution Path: Domain-Wide Delegation (DWD)For enterprise scenarios where an application must act on behalf of users within a Google Workspace organization, the Shared Folder method is insufficient. The required approach is Domain-Wide Delegation (DWD). This powerful feature allows a service account to impersonate a user in the domain, performing actions with that user's identity and permissions. This is essential for applications that need to create files directly in a user's "My Drive" or interact with their data seamlessly, without requiring the user to go through an OAuth consent flow each time.344.1 Conceptual Framework: Impersonation vs. Direct AccessThe decision to use DWD over the Shared Folder method is a significant architectural choice with profound implications for security, file ownership, and auditing. It is not merely a technical alternative but a shift in the application's operational paradigm.Direct Access (Shared Folder Method): The service account acts as itself. It is an autonomous, non-human entity. Files it creates are owned by the service account (or by the Shared Drive, if applicable). The audit trail for any action, such as file creation or modification, clearly points to the service account's email address.4 This model is simpler, more contained, and generally carries a lower security risk.Impersonation (DWD Method): The service account is authorized to temporarily assume the identity of a specified user within the Google Workspace domain.8 When the application makes an API call, it does so as that user. A spreadsheet created via impersonation is owned by the impersonated user, not the service account. Crucially, the Google Workspace audit logs will record the action as having been performed by the impersonated user.36This distinction is critical. DWD is necessary for applications that must integrate into user-centric workflows, such as an automated system that generates a personalized "Weekly Sales Report" and places it directly in each sales manager's private Drive. However, this power comes with significant responsibility. A compromised service account with DWD enabled could potentially impersonate any user, including a super administrator, and access or modify data according to the scopes granted.37 Therefore, DWD should only be implemented when impersonation is a strict functional requirement and must be accompanied by rigorous security controls.374.2 Administrator Workflow: Authorizing the Service AccountUnlike the Shared Folder method, configuring DWD requires the intervention of a Google Workspace Super Administrator. A developer cannot perform these steps alone. The administrator must explicitly authorize the service account to act on behalf of users in the domain.The process is as follows:Obtain the Service Account Client ID: The developer must provide the administrator with the service account's Client ID (also referred to as the Unique ID). This is found in the Google Cloud Console under "IAM & Admin > Service Accounts" by selecting the specific service account. It is a long numeric string, not the service account's email address.20Navigate to the Admin Console: The Super Administrator must sign in to the Google Admin Console.Access Domain-Wide Delegation Settings: The administrator navigates to Menu > Security > Access and data control > API controls. In this section, they will find and select Manage Domain Wide Delegation.34Add a New API Client:The administrator clicks "Add new".In the "Client ID" field, they paste the unique Client ID of the service account provided by the developer.35In the "OAuth Scopes" field, they enter a comma-delimited list of all the scopes the application requires. For creating sheets, this would be https://www.googleapis.com/auth/spreadsheets,https://www.googleapis.com/auth/drive.8 It is critical to grant only the necessary scopes to limit potential misuse.37Authorize the Client: The administrator clicks "Authorize". The service account is now delegated with domain-wide authority for the specified scopes. It may take up to 24 hours for these changes to fully propagate across Google's systems, though it often happens much faster.344.3 Developer Workflow: Implementing ImpersonationOnce the administrator has authorized the service account, the developer must modify the application's authentication code to specify which user to impersonate. The core API calls to create the sheet remain the same, but the credential object is constructed differently.Python Example (google-api-python-client)The with_subject() method is used to create a new credential object that will act on behalf of the specified user.Pythonfrom google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# --- Configuration ---
SERVICE_ACCOUNT_FILE = 'path/to/your/service_account_key.json'
# Email of the user to impersonate
USER_TO_IMPERSONATE = 'user.email@yourdomain.com'
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

def create_sheet_as_user(title):
    """Creates a new Google Sheet by impersonating a user via DWD."""
    # Load base service account credentials
    creds = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    
    # Create delegated credentials by specifying the subject (user to impersonate)
    delegated_creds = creds.with_subject(USER_TO_IMPERSONATE)
    
    try:
        # Use the delegated credentials to build the API services
        sheets_service = build('sheets', 'v4', credentials=delegated_creds)

        # Create the spreadsheet using the Sheets API
        # It will be created in the impersonated user's "My Drive"
        spreadsheet_body = {
            'properties': {
                'title': title
            }
        }
        
        new_sheet = sheets_service.spreadsheets().create(
            body=spreadsheet_body
        ).execute()

        spreadsheet_id = new_sheet.get('spreadsheetId')
        print(f"Successfully created sheet '{title}' on behalf of {USER_TO_IMPERSONATE}")
        print(f"Spreadsheet ID: {spreadsheet_id}")
        
        return spreadsheet_id

    except HttpError as error:
        print(f"An error occurred: {error}")
        # The error may indicate DWD is not configured correctly or scopes are missing.
        return None

if __name__ == '__main__':
    create_sheet_as_user('Impersonated Report')
This code first loads the service account's own credentials and then uses .with_subject() to create a new set of credentials for impersonation.8 The subsequent API call is made with the identity of user.email@yourdomain.com.Node.js Example (googleapis)In Node.js, the subject property can be passed to the JWT constructor for impersonation.JavaScriptconst { google } = require('googleapis');
const path = require('path');

// --- Configuration ---
const KEYFILEPATH = path.join(__dirname, 'path/to/your/service_account_key.json');
const USER_TO_IMPERSONATE = 'user.email@yourdomain.com';
const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
];

async function createSheetAsUser(title) {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: KEYFILEPATH,
            scopes: SCOPES,
            // The client email and private key are taken from the key file
            // We specify the user to impersonate in the client options
        });

        const authClient = await auth.getClient();
        
        // Gaining an impersonated client
        const impersonatedAuth = await auth.impersonate({
            targetPrincipal: USER_TO_IMPERSONATE,
            // Scopes are inherited from the main auth object
        });
        
        // Build the Sheets API service with the impersonated auth client
        const sheets = google.sheets({ version: 'v4', auth: impersonatedAuth });

        const resource = {
            properties: {
                title: title,
            },
        };

        const response = await sheets.spreadsheets.create({
            resource,
            fields: 'spreadsheetId',
        });

        const spreadsheetId = response.data.spreadsheetId;
        console.log(`Successfully created sheet '${title}' on behalf of ${USER_TO_IMPERSONATE}`);
        console.log(`Spreadsheet ID: ${spreadsheetId}`);

        return spreadsheetId;

    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
        return null;
    }
}

createSheetAsUser('Impersonated Report (NodeJS)');
Java Example (Google API Client Library for Java)The Java library provides a .createDelegated() method on the GoogleCredentials object for impersonation.Javaimport com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.HttpRequestInitializer;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.Spreadsheet;
import com.google.api.services.sheets.v4.model.SpreadsheetProperties;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;

import java.io.FileInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.List;

public class CreateSheetWithDWD {

    // --- Configuration ---
    private static final String SERVICE_ACCOUNT_FILE = "path/to/your/service_account_key.json";
    private static final String USER_TO_IMPERSONATE = "user.email@yourdomain.com";
    private static final List<String> SCOPES = Arrays.asList(
            SheetsScopes.SPREADSHEETS,
            SheetsScopes.DRIVE
    );

    public static String createSheetAsUser(String title) throws IOException, GeneralSecurityException {
        // Load base service account credentials
        GoogleCredentials credentials = GoogleCredentials.fromStream(new FileInputStream(SERVICE_ACCOUNT_FILE))
               .createScoped(SCOPES);
        
        // Create delegated credentials
        GoogleCredentials delegatedCredentials = credentials.createDelegated(USER_TO_IMPERSONATE);
        HttpRequestInitializer requestInitializer = new HttpCredentialsAdapter(delegatedCredentials);

        // Build the Sheets API service
        final NetHttpTransport httpTransport = GoogleNetHttpTransport.newTrustedTransport();
        Sheets sheetsService = new Sheets.Builder(httpTransport, GsonFactory.getDefaultInstance(), requestInitializer)
               .setApplicationName("Java DWD Sheets Creator")
               .build();

        // Create the spreadsheet
        Spreadsheet spreadsheet = new Spreadsheet()
               .setProperties(new SpreadsheetProperties().setTitle(title));

        try {
            Spreadsheet createdSheet = sheetsService.spreadsheets().create(spreadsheet)
                   .setFields("spreadsheetId")
                   .execute();

            String spreadsheetId = createdSheet.getSpreadsheetId();
            System.out.println("Successfully created sheet '" + title + "' on behalf of " + USER_TO_IMPERSONATE);
            System.out.println("Spreadsheet ID: " + spreadsheetId);

            return spreadsheetId;
        } catch (IOException e) {
            System.err.println("An error occurred: " + e);
            return null;
        }
    }

    public static void main(String args) {
        try {
            createSheetAsUser("Impersonated Report (Java)");
        } catch (IOException | GeneralSecurityException e) {
            e.printStackTrace();
        }
    }
}
The Java code uses .createDelegated() to achieve impersonation before building the Sheets service object, ensuring all subsequent API calls are made on behalf of the target user.84.4 Comparison of Solution PathsChoosing between the Shared Folder method and Domain-Wide Delegation is a critical architectural decision. The following table provides a concise comparison to guide this choice.FeatureShared Folder MethodDomain-Wide Delegation (DWD)Use CaseServer-to-server automation where the application acts as itself (e.g., data logging, ETL pipelines).Enterprise applications that need to act on behalf of specific users (e.g., creating personalized reports in a user's own Drive).File OwnershipThe Service Account (or the Shared Drive, if the folder is in one).The impersonated user.Audit TrailActions are logged against the service account's email address.Actions are logged against the impersonated user's email address.Setup ComplexityLow. Requires only developer access to GCP and a Google account with Drive access.High. Requires a Google Workspace Super Administrator to authorize the service account in the Admin Console.Security RiskLower. Permissions are scoped to specific shared folders. A compromise is contained.Higher. A compromised service account can impersonate any user (subject to scopes). Requires careful scope management and security practices.Source Reference78Section 5: Comprehensive Troubleshooting Checklist and Edge CasesEven with a correct understanding of the permission models, configuration errors can still occur. This checklist provides a systematic way to diagnose and resolve the 403 Forbidden error and related issues.5.1 Initial Configuration ChecksThese checks cover the most common and fundamental setup errors.API Enablement: Verify that both the Google Sheets API and the Google Drive API are enabled in your Google Cloud project's "APIs & Services" dashboard. Missing the Drive API is a frequent cause of failure.10Authentication Method: Confirm that your code is using OAuth 2.0 with a Service Account. If you are attempting to use only an API Key, it will fail for creating private sheets, as API keys are intended for accessing public, unauthenticated data.1Credentials File:Is the file path to the service account's JSON key file correct in your application's configuration or code?Does the application process have the necessary file system permissions to read the key file at that location?Is the JSON file itself correctly formatted and uncorrupted?5.2 Permission and Scope VerificationThis section focuses on the specific permissions granted to the service account.GCP IAM Roles: Ensure the service account has a suitable role (e.g., Editor or a necessary custom role) within the GCP project to use the enabled APIs.OAuth Scopes: Double-check the scopes requested in your authentication code. The request must include scopes for both Sheets and Drive, such as https://www.googleapis.com/auth/spreadsheets and https://www.googleapis.com/auth/drive (or .../drive.file).24Google Drive Folder Sharing (for Shared Folder Method):Did you share the correct resource? You must share the parent folder, not an individual file.Did you share it with the correct identity? Use the client_email from the JSON key file.Is the permission level correct? It must be Editor. A Viewer or Commenter role is insufficient for creating new files.5Domain-Wide Delegation (for DWD Method):Did the Workspace administrator authorize the correct Client ID (Unique ID) in the Admin Console?Were all the necessary scopes, including those for both Sheets and Drive, listed and authorized?Has enough time passed for the delegation settings to propagate (up to 24 hours)? 34gcloud CLI Check: If running or testing from a local development machine, use the command gcloud auth list to verify which account is currently active. An incorrect active account can lead to unexpected permission errors.65.3 Advanced and Environmental IssuesIf the basic checks pass, the issue may stem from more subtle environmental factors.The "Sudden Failure" Anomaly: Several users have reported that configurations that once worked suddenly began failing with a 403 error.2 This often indicates that Google has tightened its security policies or deprecated an implicit permission grant. The resolution is to proactively adopt one of the explicit, documented methods outlined in this report (Shared Folder or DWD) rather than relying on any legacy or undocumented behavior.Google Workspace Storage Quota: A less common but possible cause is that the Google Drive account of the target user (for DWD) or the account owning the shared folder has run out of storage space. This can sometimes manifest as a permission-like error instead of a specific quota error.6Shared Drives vs. My Drive: The permission model for Shared Drives differs slightly from "My Drive". If you are attempting to create a sheet within a Shared Drive, the service account must be added as a member of that Shared Drive. The roles are also different (e.g., Content manager corresponds to writer, while Manager corresponds to organizer). Ensure the service account has a role with file creation permissions within the Shared Drive's membership settings.5Section 6: Security Posture and Best PracticesUsing service accounts to interact with Google Workspace APIs introduces security considerations that must be managed proactively. Adhering to security best practices is essential to protect application data and user privacy, especially when using powerful features like Domain-Wide Delegation.6.1 The Principle of Least PrivilegeThe principle of least privilege dictates that a component should only be granted the minimum permissions necessary to perform its function. This minimizes the potential damage from a bug or security compromise.Restrict OAuth Scopes: Do not request broad scopes by default. If your application only needs to create and manage the files it generates, use the https://www.googleapis.com/auth/drive.file scope instead of the full https://www.googleapis.com/auth/drive scope. This prevents the application from accessing or modifying other files in the user's Drive.24Restrict IAM Roles: In production environments, avoid using primitive roles like Project > Owner or Project > Editor. Instead, create a custom IAM role that includes only the specific permissions required by the service account (e.g., serviceusage.services.use, iam.serviceAccounts.actAs).4Restrict Drive Permissions: If an application only needs to read data from a sheet, the containing folder should be shared with the service account using the Viewer role, not Editor. Grant write access only when it is a functional requirement.76.2 Managing Service Account KeysThe JSON key file is a private credential that grants access to your resources. Its compromise could lead to a significant security breach.Secure Storage: Never embed the JSON key file or its contents directly in your application's source code. Do not commit it to version control systems like Git.7 Instead, use a secure storage mechanism:Environment Variables: Load the key file path or its contents from environment variables.Secret Management Systems: Use a dedicated service like Google Secret Manager, HashiCorp Vault, or AWS Secrets Manager to store and retrieve the credentials at runtime.Key Rotation: Regularly rotate service account keys to limit the window of opportunity for a compromised key to be used. A service account can have multiple valid keys at once, which allows for a zero-downtime rotation process. You can add a new key, update your applications to use it, and then delete the old key.41 Avoid using service account keys entirely if a more secure alternative, such as workload identity federation or attaching service accounts to compute resources, is available.396.3 Secure Implementation of Domain-Wide DelegationDomain-Wide Delegation is an exceptionally powerful feature and must be treated with the highest level of security scrutiny.Use Only When Necessary: DWD should be considered a last resort, used only when the application has a critical business need to impersonate users and bypass consent flows. If the task can be accomplished with the standard OAuth consent flow or the direct access (Shared Folder) method, those should be preferred.37Strictly Limit Scopes: Work closely with the Google Workspace administrator to ensure that the list of OAuth scopes delegated to the service account is as minimal as possible. Granting overly broad scopes (like full access to Drive and Gmail) to a single service account creates a high-value target for attackers.37Isolate in Dedicated Projects: Host service accounts that have been granted DWD in dedicated, tightly controlled Google Cloud projects. These projects should not be used for other purposes, and access to them should be restricted to a minimal number of trusted administrators.37Regular Audits: The Google Workspace administrator should periodically review the list of clients with domain-wide delegation in the Admin Console. Any applications or service accounts that are no longer in use or are deemed unnecessary should have their delegation revoked immediately.34ConclusionThe 403 Forbidden: "The caller does not have permission" error encountered when using a Google Service Account to create a Google Sheet is not a simple bug, but a manifestation of fundamental architectural boundaries within the Google ecosystem. Its resolution hinges on recognizing that Google Cloud Platform and Google Workspace operate as distinct security domains. A service account, while a native principal in GCP's IAM, is an external entity to Google Drive and must be explicitly granted permissions within Drive's resource-based sharing model.Successful integration requires a holistic approach that addresses a triad of permissions:Project-Level IAM: Granting the service account the necessary roles within its GCP project.API-Level Authorization: Enabling both the Google Sheets and Google Drive APIs and requesting the correct OAuth 2.0 scopes in the application code.Resource-Level Permissions: Explicitly granting the service account Editor permissions on a destination folder within Google Drive.Developers can choose between two primary solution paths based on their architectural needs. The Shared Folder Method is a direct and secure approach for server-to-server automation, treating the service account as an independent collaborator. For more complex enterprise applications that must act on behalf of users, Domain-Wide Delegation provides a powerful impersonation capability, though it necessitates heightened security measures and administrative oversight.By implementing one of these well-defined patterns and adhering to security best practices, such as the principle of least privilege and secure key management, developers can build robust, secure, and reliable applications that successfully bridge the gap between Google Cloud and Google Workspace, transforming the 403 error from a frustrating roadblock into a solved problem.