
import { 
    healthcare, 
    PROJECT_ID, 
    LOCATION, 
    DATASET_ID, 
    FHIR_STORE_ID,
    handleBlobResponse 
} from './serverutils.js';
import { GoogleAuth } from 'google-auth-library';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;


function validateServiceAccountKey(keyString) {
    try {
        console.log('Validating service account key...');
        
        // First check if we actually have a key
        if (!keyString) {
            throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is empty');
        }

        // Try to parse the JSON
        let credentials;
        try {
            credentials = JSON.parse(keyString);
        } catch (e) {
            console.error('Failed to parse service account key JSON:', e.message);
            console.log('Key string length:', keyString.length);
            console.log('First 50 characters:', keyString.substring(0, 50) + '...');
            throw new Error('Service account key is not valid JSON');
        }

        // Validate required fields
        const requiredFields = [
            'type',
            'project_id',
            'private_key_id',
            'private_key',
            'client_email',
            'client_id'
        ];

        const missing = requiredFields.filter(field => !credentials[field]);
        if (missing.length > 0) {
            throw new Error(`Service account key missing required fields: ${missing.join(', ')}`);
        }

        // Verify it's actually a service account key
        if (credentials.type !== 'service_account') {
            throw new Error('Not a service account key (type should be "service_account")');
        }

        // Check private key format
        if (!credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
            throw new Error('Private key appears to be malformed');
        }

        console.log('Service account key validation successful:', {
            type: credentials.type,
            project_id: credentials.project_id,
            client_email: credentials.client_email
        });

        return credentials;
    } catch (error) {
        console.error('Service account key validation failed:', error.message);
        throw error;
    }
}


// Initialize auth with service account details from env
async function initializeAuth() {
    console.log('Initializing Google Cloud auth...');
    
    // Check for required environment variables
    const requiredEnvVars = {
        PROJECT_ID,
        LOCATION,
        DATASET_ID,
        FHIR_STORE_ID,
        'Service Account Key': process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        'Service Account Email': process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    };

    const missing = Object.entries(requiredEnvVars)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    try {
        // Validate and parse the service account key
        const credentials = validateServiceAccountKey(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

        // Compare email addresses
        if (credentials.client_email !== process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
            console.warn('Warning: GOOGLE_SERVICE_ACCOUNT_EMAIL does not match the email in the service account key');
        }

        // Initialize GoogleAuth with credentials
        const auth = new GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        // Test the connection
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        console.log('Google Cloud auth initialized successfully with service account:', credentials.client_email);

        return token.token;
    } catch (error) {
        console.error('Failed to initialize auth:', error);
        throw new Error(`Auth initialization failed: ${error.message}`);
    }
}

// SearchParameter definition remains the same
const inviteCodeSearchParameter = {
    resourceType: "SearchParameter",
    url: "https://combinebh.org/fhir/SearchParameter/invite-code",
    version: "1.0.0",
    name: "invite-code",
    status: "active",
    experimental: false,
    date: new Date().toISOString(),
    publisher: "CombineBH",
    description: "Search practitioners by their invite code extension value",
    code: "invite-code",
    base: ["Practitioner"],
    type: "string",
    expression: "Practitioner.extension.where(url='https://combinebh.org/resources/FHIRResources/InviteCode.html').valueString"
};

function checkKeyFormat() {
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    console.log('\nService Account Key Debug Info:');
    console.log('Key length:', key?.length);
    console.log('Contains newlines:', key?.includes('\n'));
    console.log('Contains escaped newlines:', key?.includes('\\n'));
    console.log('First few characters:', key?.substring(0, 50) + '...');
    
    // Try to detect common issues
    if (key?.includes('\\n')) {
        console.log('\nNOTE: Your key contains escaped newlines (\\n). These might need to be converted to actual newlines.');
    }
    if (key?.startsWith('"') && key?.endsWith('"')) {
        console.log('\nNOTE: Your key appears to be wrapped in quotes. These should be removed.');
    }
}

async function createSearchParameter(accessToken) {
    try {
        console.log('Creating SearchParameter for invite code...');

        const response = await axios.post(
            `${FHIR_BASE_URL}/SearchParameter`,
            inviteCodeSearchParameter,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/fhir+json'
                }
            }
        );

        const result = await handleBlobResponse(response.data);
        console.log('SearchParameter created successfully:', {
            id: result.id,
            url: result.url,
            status: result.status
        });

        return result;
    } catch (error) {
        console.error('Error creating SearchParameter:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
}

async function reindexFhirStore(accessToken) {
    try {
        console.log('Requesting FHIR store reindexing...');
        
        const response = await axios.post(
            `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}:reindex`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        const result = await handleBlobResponse(response.data);
        console.log('Reindex request submitted successfully:', {
            operation: result.name,
            status: 'IN_PROGRESS'
        });

        return result;
    } catch (error) {
        console.error('Error requesting reindex:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
}

async function verifySearchParameter(searchParameterId, accessToken) {
    try {
        console.log('Verifying SearchParameter...');

        const response = await axios.get(
            `${FHIR_BASE_URL}/SearchParameter/${searchParameterId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/fhir+json'
                }
            }
        );

        const result = await handleBlobResponse(response.data);
        console.log('SearchParameter verification successful:', {
            id: result.id,
            status: result.status,
            url: result.url
        });

        return result;
    } catch (error) {
        console.error('Error verifying SearchParameter:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
}

async function testSearch(accessToken) {
    try {
        console.log('Testing invite-code search...');

        const testCode = '6ns6dj0xp';
        const response = await axios.get(
            `${FHIR_BASE_URL}/Practitioner?invite-code=${testCode}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/fhir+json'
                }
            }
        );

        const result = await handleBlobResponse(response.data);
        console.log('Search test results:', {
            total: result.total,
            entry: result.entry?.length || 0
        });

        return result;
    } catch (error) {
        console.error('Error testing search:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
}

async function main() {
    try {
        // Debug key format first
        checkKeyFormat();

        // Get access token using service account credentials
        const accessToken = await initializeAuth();
        // ... rest of main function ...
    } catch (error) {
        console.error('Setup failed:', error.message);
        process.exit(1);
    }

    try {
        // Get access token using service account credentials
        const accessToken = await initializeAuth();
        console.log('Successfully authenticated with service account');

        // Create SearchParameter
        const searchParam = await createSearchParameter(accessToken);
        console.log('\nSearchParameter created with ID:', searchParam.id);

        // Request reindexing
        const reindexOp = await reindexFhirStore(accessToken);
        console.log('\nReindex operation started:', reindexOp.name);

        // Wait a bit before verification
        console.log('\nWaiting for reindexing to complete...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Verify SearchParameter
        await verifySearchParameter(searchParam.id, accessToken);

        // Test the search
        await testSearch(accessToken);

    } catch (error) {
        console.error('Setup failed:', error.message);
        process.exit(1);
    }
}

main().catch(console.error);
