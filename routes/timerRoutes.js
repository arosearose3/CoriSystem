// timerRoutes.js
import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse,getAccessToken } from '../serverutils.js';
import axios from 'axios';
import { google } from 'googleapis';  // Assuming you use Google API for authentication
import { getFhirAccessToken } from '../src/lib/auth/auth.js';

import { getAllTimers, createTimer, updateTimer, deleteTimer, syncTimerSystems, getCloudSchedulerClient } from './timerService.js';

import { BASE_PATH } from '../serverutils.js'; // Adjust the path as necessary
const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;

const router = express.Router();

const PARENT = `projects/${PROJECT_ID}/locations/${LOCATION}`;

//const cloudscheduler = google.cloudscheduler('v1');




router.post('/sync', async (req, res) => {
  try {
    const log = await syncTimerSystems();
    res.json({
      message: 'Timer systems synchronized successfully',
      log
    });
  } catch (error) {
    console.error('Error syncing timer systems:', error);
    res.status(500).json({
      error: 'Failed to sync timer systems',
      details: error.message
    });
  }
});


router.get('/all', async (req, res) => {
  try {
    const timers = await getAllTimers();
    res.json(timers);
  } catch (error) {
    console.error('Error fetching timers:', error);
    res.status(500).json({
      error: 'Failed to fetch timers',
      details: error.message
    });
  }
});

// create will run sync check before creating the timer
router.post('/create', async (req, res) => {
  try {
    const { name, description, schedule, timeZone = 'UTC' } = req.body;

    if (!name || !schedule) {
      console.log ("timerRoue create name: ", name," schedule: ", schedule);
      return res.status(400).json({
        error: 'Name and schedule are required.'
      });
    }

    const { job, template } = await createTimer({ name, description, schedule, timeZone });

    res.status(200).json({
      message: 'Timer created successfully',
      job: job,
      template: template
    });
  } catch (error) {
    console.error('Error creating timer:', error);
    res.status(500).json({
      error: 'Failed to create timer',
      details: error.message
    });
  }
});

// timerRoutes.js

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { oldname, name, description, schedule, timeZone } = req.body;

    // Validate required fields
    if (!name || !schedule) {
      return res.status(400).json({
        error: 'Name and schedule are required'
      });
    }

    const result = await updateTimer(id, {
      oldname,
      name,
      description,
      schedule,
      timeZone
    });

    res.json({
      message: 'Timer updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error updating timer:', error);

    // Handle specific error cases
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Timer not found',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to update timer',
      details: error.message
    });
  }
});


// Deletes Google Scheduler Job and Fhir TimerEventTemplate resource
router.post('/delete/:timerId', async (req, res) => {
  try {
    const { timerId } = req.params;
    const { timerName } = req.body.data;

    console.log ("timerRoutes delete timerId: ", timerId, " timerName: ", timerName);
    if (!timerId || !timerName) {
      return res.status(400).json({
        error: 'Timer ID and Timer Name are required'
      });
    }

    await deleteTimer(timerId, timerName);

    res.status(200).json({
      message: 'Timer deleted successfully',
      timerId,
      timerName
    });
  } catch (error) {
    console.error('Error deleting timer:', error);
    
    res.status(500).json({
      error: 'Failed to delete timer',
      details: error.message
    });
  }
});

// Pause job
router.post('/:id/pause', async (req, res) => {
  try {


    const { id } = req.params;
    const jobName = `${PARENT}/jobs/${id}`;
    const cloudscheduler = getCloudSchedulerClient();

    await cloudscheduler.projects.locations.jobs.pause({
      name: jobName
    });

    res.json({
      message: 'Job paused successfully'
    });

  } catch (error) {
    console.error('Error pausing job:', error);
    res.status(500).json({
      error: 'Failed to pause job',
      details: error.message
    });
  }
});

// Resume job
router.post('/:id/resume', async (req, res) => {
  try {
    if (!auth) {
      return res.status(400).json({
        error: 'Not connected to Google Cloud. Call /connect first.'
      });
    }

    const { id } = req.params;
    const jobName = `${PARENT}/jobs/${id}`;
 const cloudscheduler = getCloudSchedulerClient();

    await cloudscheduler.projects.locations.jobs.resume({
      name: jobName
    });

    res.json({
      message: 'Job resumed successfully'
    });

  } catch (error) {
    console.error('Error resuming job:', error);
    res.status(500).json({
      error: 'Failed to resume job',
      details: error.message
    });
  }
});

// Run job now
router.post('/:id/run', async (req, res) => {
  try {
    if (!auth) {
      return res.status(400).json({
        error: 'Not connected to Google Cloud. Call /connect first.'
      });
    }

    const { id } = req.params;
    const jobName = `${PARENT}/jobs/${id}`;
 const cloudscheduler = getCloudSchedulerClient();

    await cloudscheduler.projects.locations.jobs.run({
      name: jobName
    });

    res.json({
      message: 'Job triggered successfully'
    });

  } catch (error) {
    console.error('Error triggering job:', error);
    res.status(500).json({
      error: 'Failed to trigger job',
      details: error.message
    });
  }
});




export default router;






