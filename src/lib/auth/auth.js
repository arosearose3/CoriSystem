// auth.js
import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Load the service account key JSON from the specified path
const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf8'));

// Set up the JWT client using the service account credentials from the JSON file
const authClient = new google.auth.JWT({
  email: serviceAccountKey.client_email,
  key: serviceAccountKey.private_key.replace(/\\n/g, '\n'), // Ensure newlines are handled correctly
  scopes: ['https://www.googleapis.com/auth/cloud-platform'], // Specify necessary scopes
});

// Function to get the FHIR access token
export async function getFhirAccessToken() {
  try {
    const tokens = await authClient.authorize();
    return tokens.access_token;
  } catch (error) {
    console.error('Error fetching FHIR access token:', error);
    throw new Error('Failed to obtain FHIR access token');
  }
}
