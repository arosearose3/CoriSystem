import express from 'express';
import {
  createUserCode,
  createUserAdminCode,
  createNewOrgCode,
  getInviteCodeInfo,
  deleteInviteCode,
  getInviteCodeForOrg,       
  getInviteCodeForPractitioner
} from './inviteService.js';
import fs from 'fs/promises';

const router = express.Router();

// Helper function to read codes from files
async function readCodesFile(filepath) {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filepath}:`, error);
    return [];
  }
}


router.get('/organization/:organizationId/inviteCode', async (req, res) => {
    try {
      const { organizationId } = req.params;
      
      if (!organizationId) {
        return res.status(400).json({ error: 'organizationId is required' });
      }
  
      const inviteCode = await getInviteCodeForOrg(organizationId);
      
      if (!inviteCode) {
        return res.status(404).json({ 
          error: 'No invite code found for this organization' 
        });
      }
      
      res.json(inviteCode);
    } catch (error) {
      console.error('Failed to get org invite code:', error);
      res.status(500).json({ 
        error: 'Failed to get organization invite code'
      });
    }
  });
  
  // GET invite code for practitioner
  router.get('/practitioner/:practitionerId/inviteCode', async (req, res) => {
    try {
      const { practitionerId } = req.params;
      
      if (!practitionerId) {
        return res.status(400).json({ error: 'practitionerId is required' });
      }
  
      const inviteCode = await getInviteCodeForPractitioner(practitionerId);
      
      if (!inviteCode) {
        return res.status(404).json({ 
          error: 'No invite code found for this practitioner' 
        });
      }
      
      res.json(inviteCode);
    } catch (error) {
      console.error('Failed to get practitioner invite code:', error);
      res.status(500).json({ 
        error: 'Failed to get practitioner invite code' 
      });
    }
  });
  
// GET all user codes
router.get('/userCodes', async (req, res) => {
  try {
    const codes = await readCodesFile('./routes/userCodes.json');
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user codes' });
  }
});

// GET all admin codes
router.get('/userAdminCodes', async (req, res) => {
  try {
    const codes = await readCodesFile('./routes/userAdminCodes.json');
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch admin codes' });
  }
});

// GET all new org codes
router.get('/userNewOrgCodes', async (req, res) => {
  try {
    const codes = await readCodesFile('./routes/userNewOrgCodes.json');
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch new org codes' });
  }
});

// POST create new user code
router.post('/userCodes', async (req, res) => {
  try {
    const { practitionerId } = req.body;
    
    if (!practitionerId) {
      return res.status(400).json({ error: 'practitionerId is required' });
    }

    const code = await createUserCode(practitionerId);
    res.status(201).json({ code });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user code' });
  }
});

// POST create new admin code
router.post('/userAdminCodes', async (req, res) => {
  try {
    const { organizationId } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const code = await createUserAdminCode(organizationId);
    res.status(201).json({ code });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin code' });
  }
});

// POST create new org code
router.post('/userNewOrgCodes', async (req, res) => {
  try {
    const code = await createNewOrgCode();
    res.status(201).json({ code });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create new org code' });
  }
});

// GET info about a specific invite code
router.get('/inviteCodes/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const info = await getInviteCodeInfo(code);
    
    if (!info) {
      return res.status(404).json({ error: 'Invite code not found' });
    }
    
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get invite code info' });
  }
});

// DELETE an invite code
router.delete('/inviteCodes/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const deleted = await deleteInviteCode(code);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Invite code not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete invite code' });
  }
});

export default router;