import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration constants


const PROJECT_ID = 'combine-fhir-smart-store'
const LOCATION = 'us-central1'
const DATASET_ID = 'COMBINE-FHIR-v1'
const FHIR_STORE_ID = '1'

const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

// SearchParameter definition
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

async function getFhirAccessToken() {
    try {
        // This assumes you're running in an environment with access to Google Cloud authentication
        // You might need to modify this based on your authentication method
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-healthcare']
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        return token.token;
    } catch (error) {
        console.error('Error getting access token:', error);
        throw error;
    }
}

async function createSearchParameter() {
    try {
        console.log('Creating SearchParameter for invite code...');
        
        const accessToken = await getFhirAccessToken();
        console.log('Access token obtained successfully');

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

        console.log('SearchParameter created successfully:', {
            id: response.data.id,
            url: response.data.url,
            status: response.data.status
        });

        return response.data;
    } catch (error) {
        console.error('Error creating SearchParameter:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
}

async function reindexFhirStore() {
    try {
        console.log('Requesting FHIR store reindexing...');
        
        const accessToken = await getFhirAccessToken();
        
        const response = await axios.post(
            `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}:reindex`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        console.log('Reindex request submitted successfully:', {
            operation: response.data.name,
            status: 'IN_PROGRESS'
        });

        return response.data;
    } catch (error) {
        console.error('Error requesting reindex:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
}

async function verifySearchParameter(searchParameterId) {
    try {
        console.log('Verifying SearchParameter...');
        
        const accessToken = await getFhirAccessToken();

        const response = await axios.get(
            `${FHIR_BASE_URL}/SearchParameter/${searchParameterId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/fhir+json'
                }
            }
        );

        console.log('SearchParameter verification successful:', {
            id: response.data.id,
            status: response.data.status,
            url: response.data.url
        });

        return response.data;
    } catch (error) {
        console.error('Error verifying SearchParameter:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
}

async function testSearch() {
    try {
        console.log('Testing invite-code search...');
        
        const accessToken = await getFhirAccessToken();

        // Test with a known invite code
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

        console.log('Search test results:', {
            total: response.data.total,
            entry: response.data.entry?.length || 0
        });

        return response.data;
    } catch (error) {
        console.error('Error testing search:', {
            message: error.message,
            response: error.response?.data
        });
        throw error;
    }
}

// Main execution
async function main() {
    try {
        // Create SearchParameter
        const searchParam = await createSearchParameter();
        console.log('\nSearchParameter created with ID:', searchParam.id);

        // Request reindexing
        const reindexOp = await reindexFhirStore();
        console.log('\nReindex operation started:', reindexOp.name);

        // Wait a bit before verification (you might want to implement proper polling)
        console.log('\nWaiting for reindexing to complete...');
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Verify SearchParameter
        await verifySearchParameter(searchParam.id);

        // Test the search
        await testSearch();

    } catch (error) {
        console.error('Setup failed:', error.message);
        process.exit(1);
    }
}


// Export functions for use as a module
export {
    createSearchParameter,
    reindexFhirStore,
    verifySearchParameter,
    testSearch
};


