import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse } from '../serverutils.js';
import axios from 'axios';
import { google } from 'googleapis';  // Assuming you use Google API for authentication
import { getFhirAccessToken } from '../src/lib/auth/auth.js'; // Adjust the path as needed

import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary
import dotenv from 'dotenv';

import fs from "fs";


import multer from 'multer';
import WebSocket from 'ws';

import path from 'path';
import fetch from 'node-fetch';
import { promisify } from 'util';

import bodyParser from 'body-parser'; // To handle raw data in the body

//import {  OpenAIApi } from "openai";
import OpenAI from 'openai';
import {Readable} from 'stream';
import FormData from 'form-data'; // Import form-data to handle file uploads


const router = express.Router();
const base = BASE_PATH;
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
  });

dotenv.config(); // Load environment variables

const openai = new OpenAI(process.env.OPENAI_API_KEY);


// Utility function to convert buffer to a readable stream
function bufferToStream(buffer) {
    const readable = new Readable();
    readable._read = () => {}; // No-op
    readable.push(buffer);
    readable.push(null); // End of stream
    return readable;
  }


router.use(bodyParser.raw({ type: 'audio/wav', limit: '10mb' })); // Adjust the type and limit as needed



/**
 * This function computes a likelihood score between a user's availability and a clinician's availability.
 * The score ranges between 0 (no match) to 1 (perfect match).
 *
 * @param {Array} clientAvailability - Array of user availability objects.
 * @param {Object} clinicianBundle - FHIR bundle containing clinician PractitionerRole resources.
 * @returns {Array} - Array of clinician IDs with their corresponding match score.
 */
function scoreAvailability(clientAvailability, clinicianBundle) {
    // Helper function to check if time periods overlap
    const timeOverlap = (startA, endA, startB, endB) => {
        const startATime = new Date(`1970-01-01T${startA}Z`).getTime();
        const endATime = new Date(`1970-01-01T${endA}Z`).getTime();
        const startBTime = new Date(`1970-01-01T${startB}Z`).getTime();
        const endBTime = new Date(`1970-01-01T${endB}Z`).getTime();
        return (startATime < endBTime && endATime > startBTime); // True if there is an overlap
    };

    // Helper function to compute availability overlap score for a single clinician's availableTime
    const computeClinicianScore = (clinicianAvailability, clientAvailability) => {
        let totalScore = 0;
        let possibleScore = 0;

        clientAvailability.forEach(clientSlot => {
            clinicianAvailability.forEach(clinicianSlot => {
                // Check if both the clinician and client have availability on the same day
                const commonDays = clinicianSlot.daysOfWeek.some(day => clientSlot.daysOfWeek.includes(day));
                if (commonDays) {
                    possibleScore += 1;

                    // Check if both are available all day
                    if (clientSlot.allDay && clinicianSlot.allDay) {
                        totalScore += 1;
                    } 
                    // Check if there is a time overlap
                    else if (
                        timeOverlap(
                            clientSlot.availableStartTime,
                            clientSlot.availableEndTime,
                            clinicianSlot.availableStartTime,
                            clinicianSlot.availableEndTime
                        )
                    ) {
                        totalScore += 1;
                    }
                }
            });
        });

        // Calculate score as a fraction of matches vs possible matches
        return possibleScore > 0 ? totalScore / possibleScore : 0;
    };

    // Parse through clinician resources and compute scores
    const results = clinicianBundle.entry.map(clinician => {
        const clinicianAvailableTime = clinician.resource.availableTime || [];
        const clinicianId = clinician.resource.id;
        const score = computeClinicianScore(clinicianAvailableTime, clientAvailability);

        return {
            clinicianId,
            score: score.toFixed(2), // keep the score to 2 decimal places
        };
    });

    return results;
}



/* async function speechToTextEnglish() {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream("/path/to/file/audio.mp3"),
    model: "whisper-1",
  });

  console.log(transcription.text);
}
async function speechToTextSpanish() {
    const translation = await openai.audio.translations.create({
        file: fs.createReadStream("/path/to/file/german.mp3"),
        model: "whisper-1",
    });

    console.log(translation.text);
} */


    async function transcribeAudio(audioBuffer) {
        try {
          // Convert the buffer to a readable stream
          const audioStream = new Readable();
            audioStream.push(audioBuffer);
            audioStream.push(null); // Signals the end of the stream
      
            // Create a FormData instance
            const formData = new FormData();
            formData.append('file', audioStream, {
            filename: 'audio.wav',
            contentType: 'audio/wav',
            });
            formData.append('model', 'whisper-1');

          // Send the audio stream directly to Whisper API for transcription
          const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
            headers: {
              ...formData.getHeaders(),
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
          });

          console.log('Transcription:', response.data.text);
            return response.data.text;
      
        } catch (error) {
          console.error('Error processing audio:', error.response?.data || error.message);
          throw error;
        }
      }
      
      // Example usage in the route
      router.post('/send-audio', upload.single('audio'), async (req, res) => {
        try {
          console.log('Received raw audio data');
      
          if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded' });
          }
      
          const audioBuffer = req.file.buffer; // Raw audio data from the uploaded file
      
          if (!audioBuffer.length) {
            return res.status(400).json({ error: 'No audio data received' });
          }
      
          // Process the audio buffer using Whisper API
          const transcription = await transcribeAudio(audioBuffer);
      
          // Send the transcription back to the client
          res.json({ transcription });
          
        } catch (error) {
          console.error('Error processing audio:', error);
          res.status(500).json({ error: 'Failed to process audio' });
        }
      });

  
// Endpoint to receive availability text and return structured JSON
router.post('/deriveAvailabilityFromText', async (req, res) => {
  const { text } = req.body;
  console.log ("/derive text:"+text);

  if (!text) {
    return res.status(400).json({ error: "No text provided" });
  }

  try {
    // Set up the OpenAI API request with full prompt and examples
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4',  // Use the appropriate model for your use case
        messages: [
          {
            role: 'user',
            content: `
            You are a smart AI tasked with converting user availability into structured JSON. Here is the format:

            {
              "availableTime": [
                {
                  "daysOfWeek": ["<day>"],
                  "availableStartTime": "<start time>",
                  "availableEndTime": "<end time>",
                  "allDay": <true/false>
                }
              ]
            }

            Use this format and follow the examples below.

            ### Example 1:
            User input: "I am available on Monday from 10 AM to 12 PM."
            Output:
            {
              "availableTime": [
                {
                  "daysOfWeek": ["mon"],
                  "availableStartTime": "10:00:00",
                  "availableEndTime": "12:00:00",
                  "allDay": false
                }
              ]
            }

            ### Example 2:
            User input: "I am free all day on Friday."
            Output:
            {
              "availableTime": [
                {
                  "daysOfWeek": ["fri"],
                  "availableStartTime": "00:00:00",
                  "availableEndTime": "23:59:59",
                  "allDay": true
                }
              ]
            }

            ### Example 3:
            User input: "After lunch on weekdays until 3 PM."
            Output:
            {
              "availableTime": [
                {
                  "daysOfWeek": ["mon", "tue", "wed", "thu", "fri"],
                  "availableStartTime": "13:00:00",
                  "availableEndTime": "15:00:00",
                  "allDay": false
                }
              ]
            }

            ### Example 4:
            User input: "I am free Tuesday and Thursday from 9 AM to 11 AM."
            Output:
            {
              "availableTime": [
                {
                  "daysOfWeek": ["tue"],
                  "availableStartTime": "09:00:00",
                  "availableEndTime": "11:00:00",
                  "allDay": false
                },
                {
                  "daysOfWeek": ["thu"],
                  "availableStartTime": "09:00:00",
                  "availableEndTime": "11:00:00",
                  "allDay": false
                }
              ]
            }

            Now, convert the following user input into the structured JSON format:

            User input: "${text}"

            Output the structured JSON below:
            `
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    console.log ("/derive after API call to openAI");

    // Extract the completion from OpenAI response
    const structuredData = response.data.choices[0].message.content;

    console.log ("/derive 3");

    // Return the structured JSON back to the client
    res.json({
      success: true,
      structuredData: JSON.parse(structuredData)
    });
  } catch (error) {
    console.error("Error with OpenAI API:", error.response ? error.response.data : error.message);
    res.status(500).json({
      error: 'Failed to process request',
      details: error.response ? error.response.data : error.message
    });
  }
});

// Utility to encode audio to base64
function base64EncodeAudio(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000; // 32KB chunk size
  
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return Buffer.from(binary, 'binary').toString('base64');
  }

  export default router;

