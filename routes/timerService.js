
import express from 'express';
import { auth, healthcare, PROJECT_ID, LOCATION, DATASET_ID, FHIR_STORE_ID, handleBlobResponse,getAccessToken } from '../serverutils.js';
import axios from 'axios';
import { google } from 'googleapis';  // Assuming you use Google API for authentication
import { getFhirAccessToken } from '../src/lib/auth/auth.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables


const FHIR_BASE_URL = `https://healthcare.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/datasets/${DATASET_ID}/fhirStores/${FHIR_STORE_ID}/fhir`;
const PARENT = `projects/${PROJECT_ID}/locations/${LOCATION}`;


export async function getCloudSchedulerClient() {
  try {
    // Explicitly get credentials path
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
    if (!credentialsPath) {
      throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,  // Explicitly use the credentials file
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const cloudscheduler = google.cloudscheduler('v1');
    cloudscheduler.context._options = { auth };
    
    return cloudscheduler;
  } catch (error) {
    console.error('Error initializing Cloud Scheduler client:', error);
    throw error;
  }
}


/**
 * Gets all timer event templates from FHIR
 * @returns {Promise<Array>} Formatted timer templates
 */
export async function getAllTimerEventTemplates() {
  const accessToken = await getFhirAccessToken();
  
  const response = await axios.get(
    `${FHIR_BASE_URL}/Basic`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json'
      },
      params: {
       // '_search': 'code',
        'code': 'event-template',
       // 'system': 'http://combinebh.org/fhir/template-types'
      }
    }
  );

  const bundle = await handleBlobResponse(response.data);

  //console.log ("getAllTimerEventTemplates data:", JSON.stringify(bundle.entry));
  
  return bundle.entry
    ?.filter(entry => {
      const extensions = entry.resource.extension?.[0]?.extension || [];
      return extensions.some(e => e.url === 'type' && e.valueString === 'timer');
    })
    ?.map(entry => {
      const extensions = entry.resource.extension[0].extension;
      return {
        id: entry.resource.id,
        name: extensions.find(e => e.url === 'name')?.valueString || 'Unnamed Timer',
        description: extensions.find(e => e.url === 'description')?.valueString || '',
        schedule: extensions.find(e => e.url === 'schedule')?.valueString,
        timeZone: extensions.find(e => e.url === 'timeZone')?.valueString || 'UTC',
        schedulerJobId: extensions.find(e => e.url === 'schedulerJobId')?.valueString,
      };
    }) || [];
}

/**
 * Gets all timers after ensuring sync
 * @returns {Promise<Array>} Formatted timer information
 */
export async function getAllTimers() {

  // 0. remove dupe Basic Timer Templates
  removeDuplicateTimerEvents();
  // 1. Run sync first
  await syncTimerSystems();

  // 2. Get timer templates
  const timerTemplates = await getAllTimerEventTemplates();

  return timerTemplates;
}



export async function syncTimerSystems() {
    const log = {
      started: new Date().toISOString(),
      errors: [],
      actions: [],
      summary: {
        schedulerJobsFound: 0,
        eventTemplatesFound: 0,
        jobsCreated: 0,
        templatesCreated: 0,
        jobsDeleted: 0,
        templatesDeleted: 0,
        errors: 0
      }
    };
  
    try {
      // 1. Get all Cloud Scheduler jobs
      const cloudscheduler = await getCloudSchedulerClient();

      const schedulerResponse = await cloudscheduler.projects.locations.jobs.list({
        parent: PARENT
      });


      const schedulerJobs = schedulerResponse.data.jobs || [];
      log.summary.schedulerJobsFound = schedulerJobs.length;
  
      // 2. Get all timer Event Templates
      const accessToken = await getFhirAccessToken();
      const templateResponse = await axios.get(
        `${FHIR_BASE_URL}/Basic`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/fhir+json'
          },
          params: {
            'code': 'event-template',
           // '_tag': 'type:timer'
          }
        }
      );
      const eventTemplates = templateResponse.data.entry?.map(e => e.resource) || [];
      log.summary.eventTemplatesFound = eventTemplates.length;
  
      // 3. Create maps for easy lookup
      const jobMap = new Map(schedulerJobs.map(job => [job.name.split('/').pop(), job]));
      const templateMap = new Map(eventTemplates.map(template => [
        template.extension[0].extension.find(e => e.url === 'schedulerJobId')?.valueString,
        template
      ]));
  
      // 4. Create missing Event Templates for Scheduler Jobs
      for (const [jobId, job] of jobMap) {
        if (!templateMap.has(jobId)) {
          try {
            const template = await createEventTemplateForJob(job);
            log.actions.push({
              action: 'create_template',
              jobId,
              templateId: template.id,
              timestamp: new Date().toISOString()
            });
            log.summary.templatesCreated++;
          } catch (error) {
            log.errors.push({
              type: 'template_creation_failed',
              jobId,
              error: error.message,
              timestamp: new Date().toISOString()
            });
            log.summary.errors++;
          }
        }
      }
  
      // 5. Create missing Scheduler Jobs for Event Templates
      for (const [schedulerJobId, template] of templateMap) {
        if (!jobMap.has(schedulerJobId)) {
          try {
            const job = await createSchedulerJobForTemplate(template);
            log.actions.push({
              action: 'create_job',
              templateId: template.id,
              jobId: job.name,
              timestamp: new Date().toISOString()
            });
            log.summary.jobsCreated++;
          } catch (error) {
            log.errors.push({
              type: 'job_creation_failed',
              templateId: template.id,
              error: error.message,
              timestamp: new Date().toISOString()
            });
            log.summary.errors++;
          }
        }
      }
  
      // 6. Update Event Templates to match Scheduler Jobs
      for (const [jobId, template] of templateMap) {
        const job = jobMap.get(jobId);
        if (job) {
          try {
            await syncTemplateWithJob(template, job);
            log.actions.push({
              action: 'sync_template',
              jobId,
              templateId: template.id,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            log.errors.push({
              type: 'template_sync_failed',
              jobId,
              templateId: template.id,
              error: error.message,
              timestamp: new Date().toISOString()
            });
            log.summary.errors++;
          }
        }
      }
  
      log.completed = new Date().toISOString();
     // await saveTimerSyncLog(log);
      
      return log;
  
    } catch (error) {
      log.errors.push({
        type: 'sync_system_error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      log.summary.errors++;
    //  await saveTimerSyncLog(log);
      throw error;
    }
  }
  
  async function createEventTemplateForJob(job) {
    const accessToken = await getFhirAccessToken();
    
    const template = {
      resourceType: "Basic",
      code: {
        coding: [{
          system: "http://combinebh.org/fhir/event-types",
          code: "event-template"
        }]
      },
      extension: [{
        url: "http://combinebh.org/fhir/event-template",
        extension: [
          {
            url: "name",
            valueString: job.description?.split('|')[0] || 'Unnamed Timer',
          },
          {
            url: "description",
            valueString: job.description?.split('|')[1] || '',
          },

          {
            url: "type",
            valueString: "timer"
          },
          {
            url: "schedule",
            valueString: job.schedule
          },
          {
            url: "timeZone",
            valueString: job.timeZone
          },
          {
            url: "schedulerJobId",
            valueString: job.name.split('/').pop()
          }
        ]
      }]
    };
  
    const response = await axios.post(
      `${FHIR_BASE_URL}/Basic`,
      template,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json'
        }
      }
    );
  
    return response.data;
  }
  
  async function createSchedulerJobForTemplate(template) {
    // Extract data from template extensions
    const extensions = template.extension[0].extension;
    const name = extensions.find(e => e.url === 'name')?.valueString;
    const description = extensions.find(e => e.url === 'description')?.valueString;
    const schedule = extensions.find(e => e.url === 'schedule')?.valueString;
    const timeZone = extensions.find(e => e.url === 'timeZone')?.valueString || 'UTC';
    const schedulerJobId = extensions.find(e => e.url === 'schedulerJobId')?.valueString;
  
    // Format data for createGoogleSchedulerJob
    const jobData = {
      name: schedulerJobId, // Use the stored scheduler ID
      description: description,
      schedule: schedule,
      timeZone: timeZone,
      templateReference: `Basic/${template.id}` // Include template reference
    };
  
    // Use the service function
    return await createGoogleSchedulerJob(jobData);
  }
  
  async function syncTemplateWithJob(template, job) {
    const accessToken = await getFhirAccessToken();
    
    // Extract job details
    const schedule = job.schedule;
    const timeZone = job.timeZone;
    const [name, description] = job.description?.split('|') || ['', ''];
  
    // Update template if needed
    const needsUpdate = 
      template.name !== name ||
      template.description !== description ||
      template.extension[0].extension.find(e => e.url === 'schedule')?.valueString !== schedule ||
      template.extension[0].extension.find(e => e.url === 'timeZone')?.valueString !== timeZone;
  
    if (needsUpdate) {
      const updatedTemplate = {
        ...template,
        name,
        description,
        extension: [{
          ...template.extension[0],
          extension: template.extension[0].extension.map(e => {
            if (e.url === 'schedule') return { ...e, valueString: schedule };
            if (e.url === 'timeZone') return { ...e, valueString: timeZone };
            return e;
          })
        }]
      };
  
      await axios.put(
        `${FHIR_BASE_URL}/Basic/${template.id}`,
        updatedTemplate,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/fhir+json'
          }
        }
      );
    }
  }
  
  async function saveTimerSyncLog(log) {
    try {
      const accessToken = await getFhirAccessToken();
      
      const logResource = {
        resourceType: "Basic",
        meta: {
          "profile": [
            "https://combinebh.org/resources/FHIRResources/StructureDefinition/timer-sync-log.json"
          ]
        },
        text: {  // Add narrative
          status: "generated",
          div: `<div xmlns="http://www.w3.org/1999/xhtml">Timer sync log from ${log.started}</div>`
        },
        code: {
          coding: [{
            system: "https://combinebh.org/resources/FHIRResources/ValueSet/log-types.json",
            code: "timer-sync-log",
            display: "Timer Synchronization Log"
          }]
        },
        subject: {
          identifier: {
            system: "https://combinebh.org/resources/FHIRResources/StructureDefinition/timer-sync-log.json",
            value: `timer-sync-${log.started}`
          }
        },
        extension: [{
          url: "https://combinebh.org/resources/FHIRResources/StructureDefinition/timer-sync-log.json",
          extension: [
            {
              url: "summary",
              extension: [
                {
                  url: "schedulerJobsFound",
                  valueInteger: log.summary.schedulerJobsFound
                },
                {
                  url: "eventTemplatesFound",
                  valueInteger: log.summary.eventTemplatesFound
                },
                {
                  url: "jobsCreated",
                  valueInteger: log.summary.jobsCreated
                },
                {
                  url: "templatesCreated",
                  valueInteger: log.summary.templatesCreated
                },
                {
                  url: "jobsDeleted",
                  valueInteger: log.summary.jobsDeleted
                },
                {
                  url: "templatesDeleted",
                  valueInteger: log.summary.templatesDeleted
                },
                {
                  url: "errors",
                  valueInteger: log.summary.errors
                }
              ]
            }
          ]
        }]
      };
  
      // Only add errors extension if there are errors
      if (log.errors && log.errors.length > 0) {
        logResource.extension[0].extension.push({
          url: "errors",
          extension: log.errors.map(error => ({
            url: "error",
            extension: [
              {
                url: "type",
                valueString: error.type
              },
              {
                url: "message",
                valueString: error.message
              },
              {
                url: "timestamp",
                valueDateTime: error.timestamp
              }
            ]
          }))
        });
      }
  
      // Only add actions extension if there are actions
      if (log.actions && log.actions.length > 0) {
        logResource.extension[0].extension.push({
          url: "actions",
          extension: log.actions.map(action => ({
            url: "action",
            extension: [
              {
                url: "type",
                valueString: action.action
              },
              {
                url: "jobId",
                valueString: action.jobId
              },
              {
                url: "templateId",
                valueString: action.templateId
              },
              {
                url: "timestamp",
                valueDateTime: action.timestamp
              }
            ]
          }))
        });
      }
  
      const response = await axios.post(
        `${FHIR_BASE_URL}/Basic`,
        logResource,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/fhir+json',
            Accept: 'application/fhir+json'
          }
        }
      );
  
      return response.data;
    } catch (error) {
      console.error('Error saving sync log:', error);
      console.error('Detailed error:', error.response?.data || error);
    }
  }
  
  export async function createGoogleSchedulerJob(jobData) {
    const { 
      name, 
      description, 
      schedule, 
      timeZone = 'UTC',
      templateReference = null // Add optional template reference
    } = jobData;
  
    if (!name || !schedule) {
      throw new Error('Name and schedule are required for scheduler job');
    }
  
    const cloudscheduler = await getCloudSchedulerClient();
    const response = await cloudscheduler.projects.locations.jobs.create({
      parent: PARENT,
      requestBody: {
        name: `${PARENT}/jobs/${name}`,
        description: `${name}|${description || ''}`,
        schedule,
        timeZone,
        pubsubTarget: {
          topicName: "projects/combine-fhir-smart-store/topics/Timers",
          data: Buffer.from(JSON.stringify({
            type: 'timer',
            name: name,
            templateReference, // Will be null for new timers, set for templates
            schedule: schedule,
            timeZone: timeZone
          })).toString('base64')
        }
      }
    });
  
    return response.data;
  }

export async function createTimerEventTemplate(timerData, schedulerJobId) {
  const accessToken = await getFhirAccessToken();
  
  const eventTemplate = {
    resourceType: "Basic",
    code: {
      coding: [{
        system: "http://combinebh.org/fhir/template-types",
        code: "event-template"
      }]
    },
    extension: [{
      url: "http://combinebh.org/fhir/event-template",
      extension: [
        {
          url: "name",
          valueString: timerData.name
        },
        {
          url: "description",
          valueString: timerData.description
        },
        {
          url: "type",
          valueString: "timer"
        },
        {
          url: "schedule",
          valueString: timerData.schedule
        },
        {
          url: "timeZone",
          valueString: timerData.timeZone
        },
        {
          url: "schedulerJobId",
          valueString: schedulerJobId
        }
      ]
    }]
  };

  const response = await axios.post(
    `${FHIR_BASE_URL}/Basic`,
    eventTemplate,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/fhir+json'
      }
    }
  );

  return response.data;
}

export async function createTimer(timerData) {
  try {
 
      // 1. Create scheduler job
      const jobResponse = await createGoogleSchedulerJob(timerData);
      const schedulerJobId = jobResponse.name.split('/').pop();

      // 2. Create event template
      const templateResponse = await createTimerEventTemplate(
        timerData,
        schedulerJobId
      );
      return {
        job: jobResponse,
        template: templateResponse
      };
  } catch (error) {
    console.error('Error creating timer:', error);
    throw error;
  }
}



export async function deleteGoogleSchedulerJob(jobId) {
  try {
    const cloudscheduler = await getCloudSchedulerClient();
    const jobName = `${PARENT}/jobs/${jobId}`;

    await cloudscheduler.projects.locations.jobs.delete({
      name: jobName
    });

    return true;
  } catch (error) {
    console.error('Error deleting scheduler job:', error);
    if (error.response?.status === 404) {
      return true; // Job doesn't exist, consider it deleted
    }
    throw new Error(`Failed to delete scheduler job: ${error.message}`);
  }
}

export async function deleteTimerEventTemplate(timerId) {
  console.log ("in deleteTimerEvent with:", timerId);
  const accessToken = await getFhirAccessToken();

   try{
    const result = await axios.delete(
      `${FHIR_BASE_URL}/Basic/${timerId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        }
      }
    );
    console.log("deleteTimerEvent deleted:", timerId, "- Result:", result.data);

    return true;
  } catch (error) {
    console.error('Error deleting timer event template:', error);
    if (error.response?.status === 404) {
      return true; // Template doesn't exist, consider it deleted
    }
    throw new Error(`Failed to delete timer event template: ${error.message}`);
  }
}

export async function deleteTimer(timerId, timerName) {
  try {
    const results = await Promise.allSettled([
      deleteGoogleSchedulerJob(timerName),
      deleteTimerEventTemplate(timerId)
    ]);

    // Check for failures
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      const errors = failures.map(f => f.reason.message).join('; ');
      throw new Error(`Timer deletion partially failed: ${errors}`);
    }

    return true;
  } catch (error) {
    console.error('Error deleting timer:', error);
    throw error;
  }
}

//delete duplicate TimerEvents (Fhir Basic resources)
export async function removeDuplicateTimerEvents() {
  const timerEvents = await getAllTimerEventTemplates();
  const uniqueEvents = {};
  for (const event of timerEvents) {
    const schedulerJobId = event.schedulerJobId;
    if (schedulerJobId && !uniqueEvents[schedulerJobId]) {
      uniqueEvents[schedulerJobId] = event;
    } else if (schedulerJobId) {
      console.log("Deleting duplicate Timer Event Template:", event.id);
      await deleteTimerEventTemplate(event.id);
    }
  }
  return Object.values(uniqueEvents);
}

export async function updateGoogleSchedulerJob(id, updateData) {
  try {
    const { name, description, schedule, timeZone } = updateData;
    const cloudscheduler = await getCloudSchedulerClient();
    const jobName = `${PARENT}/jobs/${id}`;

    // First get existing job
    const existingJob = await cloudscheduler.projects.locations.jobs.get({
      name: jobName
    });

    // Parse existing template reference from pubsub data
    const existingData = JSON.parse(
      Buffer.from(existingJob.data.pubsubTarget.data, 'base64').toString()
    );

    // Update job configuration
    const updatedJob = {
      name: jobName,
      description: `${name}|${description || ''}`,
      schedule,
      timeZone: timeZone || existingJob.data.timeZone,
      pubsubTarget: {
        topicName: "projects/combine-fhir-smart-store/topics/Timers",
        data: Buffer.from(JSON.stringify({
          type: 'timer',
          name: name,
          templateReference: existingData.templateReference, // Preserve template reference
          schedule: schedule,
          timeZone: timeZone
        })).toString('base64')
      }
    };

    const response = await cloudscheduler.projects.locations.jobs.patch({
      name: jobName,
      updateMask: 'description,schedule,timeZone,pubsubTarget.data',
      requestBody: updatedJob
    });

    return response.data;
  } catch (error) {
    console.error('Error updating scheduler job:', error);
    throw new Error(`Failed to update scheduler job: ${error.message}`);
  }
}

export async function updateTimerEventTemplate(id, updateData) {
  try {
    const accessToken = await getFhirAccessToken();
    const { name, description, schedule, timeZone } = updateData;

    // First find the template with matching schedulerJobId
    const response = await axios.get(
      `${FHIR_BASE_URL}/Basic/${id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/fhir+json'
        }
      }
    );

    const existingTemplate = response.data;

    // Update the template while preserving other extensions
    const updatedTemplate = {
      ...existingTemplate,
      extension: [{
        url: "http://combinebh.org/fhir/event-template",
        extension: existingTemplate.extension[0].extension.map(e => {
          switch (e.url) {
            case 'name':
              return { ...e, valueString: name };
            case 'description':
              return { ...e, valueString: description };
            case 'schedule':
              return { ...e, valueString: schedule };
            case 'timeZone':
              return { ...e, valueString: timeZone };
            default:
              return e;
          }
        })
      }]
    };

    const updateResponse = await axios.put(
      `${FHIR_BASE_URL}/Basic/${id}`,
      updatedTemplate,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/fhir+json'
        }
      }
    );

    return updateResponse.data;
  } catch (error) {
    console.error('Error updating timer event template:', error);
    throw new Error(`Failed to update timer event template: ${error.message}`);
  }
}

export async function updateTimer(id, updateData) {
  try {
    // Validate required fields
    const { oldname, name, schedule } = updateData;
    if (!name || !schedule) {
      throw new Error('Name and schedule are required for timer update');
    }

    // Execute update within sync check
  
      // Find the template with this scheduler job ID
      const templates = await getAllTimerEventTemplates();
      const template = templates.find(t => t.schedulerJobId === oldname);
      
      if (!template) {
        throw new Error('Timer template not found');
      }

      // Update both resources
      const [jobResult, templateResult] = await Promise.all([
        updateGoogleSchedulerJob(id, updateData),
        updateTimerEventTemplate(template.id, updateData)
      ]);

      return {
        job: jobResult,
        template: templateResult
      };


 
  } catch (error) {
    console.error('Error updating timer:', error);
    throw error;
  }
}
