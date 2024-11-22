// generator.js
import fs from 'fs/promises';
import path from 'path';

const FHIR_RESOURCES = [
  'ServiceRequest',
  'Task',
  'Questionnaire',
  'QuestionnaireResponse',
  'Condition',
  'Goal',
  'Procedure',
  'Patient',
  'Practitioner',
  'Organization',
  'Consent',
  'Appointment',
  'Coverage',
  'EligibilityResponse',
  'Communication',
  'Basic',
  'Observation'
];

// Custom operations for specific resources
const RESOURCE_SPECIFIC_OPERATIONS = {
  Organization: {
    getOrgName: { method: 'GET', path: '/getOrgName', queryParam: 'reference' },
    getOrgEmail: { method: 'GET', path: '/getOrgEmail', queryParam: 'reference' }
  },
  Patient: {
    getPatientName: { method: 'GET', path: '/getPatientName', queryParam: 'reference' },
    searchByIdentifier: { method: 'GET', path: '/searchByIdentifier', queryParam: 'identifier' }
  },
  ServiceRequest: {
    findByPatient: { method: 'GET', path: '/findByPatient', queryParam: 'patientId' },
    findActive: { method: 'GET', path: '/findActive' }
  },
  Task: {
    updateStatus: { method: 'PUT', path: '/updateStatus/:id' },
    findByServiceRequest: { method: 'GET', path: '/findByServiceRequest', queryParam: 'serviceRequestId' }
  }
};

const generateRouteFile = (resource) => `// ${resource}Routes.js
import express from 'express';
import { auth } from '../serverutils.js';
import {
  create${resource},
  getAll${resource}s,
  get${resource}ById,
  update${resource},
  delete${resource}${getAdditionalImports(resource)}
} from './${resource}Service.js';

const router = express.Router();

// Middleware to check auth
const checkAuth = (req, res, next) => {
  if (!auth) {
    return res.status(400).json({ error: 'Not connected to Google Cloud. Call /connect first.' });
  }
  next();
};

router.use(checkAuth);

// Add a new ${resource}
router.post('/add', async (req, res) => {
  try {
    const result = await create${resource}(req.body);
    res.status(201).json({ message: '${resource} created successfully', data: result });
  } catch (error) {
    res.status(500).json({ error: \`Failed to create ${resource}\`, details: error.message });
  }
});

// Get all ${resource}s
router.get('/all', async (req, res) => {
  try {
    const results = await getAll${resource}s();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: \`Failed to fetch ${resource}s\`, details: error.message });
  }
});

// Get one ${resource}
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: '${resource} ID is required.' });
    }
    const result = await get${resource}ById(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: \`Failed to fetch ${resource}\`, details: error.message });
  }
});

// Update ${resource}
router.put('/update/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: '${resource} ID is required.' });
    }
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid ${resource.toLowerCase()} data.' });
    }
    const updated${resource} = await update${resource}(id, req.body);
    res.json({ message: '${resource} updated successfully', data: updated${resource} });
  } catch (error) {
    res.status(500).json({ error: \`Failed to update ${resource}\`, details: error.message });
  }
});

// Delete ${resource}
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: '${resource} ID is required.' });
    }
    const result = await delete${resource}(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: \`Failed to delete ${resource}\`, details: error.message });
  }
});

${generateResourceSpecificEndpoints(resource)}

export default router;
`;

const generateServiceFile = (resource) => `// ${resource}Service.js
import { callFhirApi } from '../utils/fhirClient.js';
import { logger } from '../utils/logger.js';

export async function create${resource}(data) {
  logger.info(\`Creating ${resource}\`, { data });
  return callFhirApi('POST', '${resource}', data);
}

export async function getAll${resource}s() {
  logger.info(\`Fetching all ${resource}s\`);
  return callFhirApi('GET', '${resource}');
}

export async function get${resource}ById(id) {
  logger.info(\`Fetching ${resource}\`, { id });
  return callFhirApi('GET', \`${resource}/\${id}\`);
}

export async function update${resource}(id, data) {
  logger.info(\`Updating ${resource}\`, { id, data });
  return callFhirApi('PUT', \`${resource}/\${id}\`, data);
}

export async function delete${resource}(id) {
  logger.info(\`Deleting ${resource}\`, { id });
  return callFhirApi('DELETE', \`${resource}/\${id}\`);
}

${generateResourceSpecificServices(resource)}
`;

function getAdditionalImports(resource) {
  const operations = RESOURCE_SPECIFIC_OPERATIONS[resource];
  if (!operations) return '';
  
  return ',\n  ' + Object.keys(operations)
    .map(op => op)
    .join(',\n  ');
}

function generateResourceSpecificEndpoints(resource) {
  const operations = RESOURCE_SPECIFIC_OPERATIONS[resource];
  if (!operations) return '';

  return Object.entries(operations).map(([opName, config]) => {
    if (config.method === 'GET') {
      return `
// ${opName}
router.get('${config.path}', async (req, res) => {
  try {
    ${config.queryParam ? `
    const { ${config.queryParam} } = req.query;
    if (!${config.queryParam}) {
      return res.status(400).json({ error: '${config.queryParam} is required' });
    }
    ` : ''}
    const result = await ${opName}(${config.queryParam ? config.queryParam : ''});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: \`Failed to execute ${opName}\`, details: error.message });
  }
});`;
    }
    if (config.method === 'PUT') {
      return `
// ${opName}
router.put('${config.path}', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ${opName}(id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: \`Failed to execute ${opName}\`, details: error.message });
  }
});`;
    }
    return '';
  }).join('\n');
}

function generateResourceSpecificServices(resource) {
  const operations = RESOURCE_SPECIFIC_OPERATIONS[resource];
  if (!operations) return '';

  return Object.entries(operations).map(([opName, config]) => {
    if (config.queryParam) {
      return `
export async function ${opName}(${config.queryParam}) {
  logger.info(\`Executing ${opName}\`, { ${config.queryParam} });
  return callFhirApi('${config.method}', \`${resource}?\${${config.queryParam}}\`);
}`;
    }
    if (config.path.includes(':id')) {
      return `
export async function ${opName}(id, data) {
  logger.info(\`Executing ${opName}\`, { id, data });
  return callFhirApi('${config.method}', \`${resource}/\${id}\`, data);
}`;
    }
    return `
export async function ${opName}() {
  logger.info(\`Executing ${opName}\`);
  return callFhirApi('${config.method}', \`${resource}\`);
}`;
  }).join('\n');
}

async function generateFiles() {
  try {
    await fs.mkdir('generated/routes', { recursive: true });
    await fs.mkdir('generated/services', { recursive: true });

    for (const resource of FHIR_RESOURCES) {
      // Generate route file
      const routeContent = generateRouteFile(resource);
      await fs.writeFile(
        path.join('generated/routes', `${resource}Routes.js`),
        routeContent
      );

      // Generate service file
      const serviceContent = generateServiceFile(resource);
      await fs.writeFile(
        path.join('generated/services', `${resource}Service.js`),
        serviceContent
      );

      console.log(`Generated files for ${resource}`);
    }

    // Generate index files
    const routeIndexContent = FHIR_RESOURCES
      .map(resource => `export { default as ${resource}Routes } from './${resource}Routes.js';`)
      .join('\n');
    await fs.writeFile('generated/routes/index.js', routeIndexContent);

    const serviceIndexContent = FHIR_RESOURCES
      .map(resource => 
        `export { create${resource}, getAll${resource}s, get${resource}ById, update${resource}, delete${resource} } from './${resource}Service.js';`
      )
      .join('\n');
    await fs.writeFile('generated/services/index.js', serviceIndexContent);

    console.log('Successfully generated all files!');
  } catch (error) {
    console.error('Error generating files:', error);
  }
}

// Run the generator
generateFiles();