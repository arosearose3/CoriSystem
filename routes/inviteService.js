import fs from 'fs/promises';



export async function getInviteCodeForOrg(organizationId) {
  try {
    const adminCodes = await readJsonFile('./routes/userAdminCodes.json');
    const code = adminCodes.find(c => c.OrganizationId === organizationId);
    
    if (code) {
      return {
        code: code.code,
        type: 'admin',
        OrganizationId: code.OrganizationId
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding org invite code:', error);
    throw error;
  }
}

export async function getInviteCodeForPractitioner(practitionerId) {
  try {
    const userCodes = await readJsonFile('./routes/userCodes.json');
    const code = userCodes.find(c => c.practitionerId === practitionerId);
    
    if (code) {
      return {
        code: code.code,
        type: 'user',
        practitionerId: code.practitionerId
      };
    }
    return null;
  } catch (error) {
    console.error('Error finding practitioner invite code:', error);
    throw error;
  }
}

function generateInviteCode() {
  const chars = 'abcdefghijkmnopqrstuvwxyz023456789';
  let code = '';
  for (let i = 0; i < 9; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function createUserCode(practitionerId) {
  const codes = await readJsonFile('./routes/userCodes.json');
  const newCode = {
    code: generateInviteCode(),
    practitionerId
  };
  
  codes.push(newCode);
  console.log ("inviteService createUserCode newcode: ", newCode);
  await writeJsonFile('./routes/userCodes.json', codes);
  return newCode.code;
}

export async function createUserAdminCode(organizationId) {
  const codes = await readJsonFile('./routes/userAdminCodes.json');
  const newCode = {
    code: generateInviteCode(),
    OrganizationId: organizationId
  };
  
  codes.push(newCode);
  await writeJsonFile('./routes/userAdminCodes.json', codes);
  return newCode.code;
}

export async function createNewOrgCode() {
  const codes = await readJsonFile('./routes/userNewOrgCodes.json');
  const newCode = {
    code: generateInviteCode()
  };
  
  codes.push(newCode);
  await writeJsonFile('./routes/userNewOrgCodes.json', codes);
  return newCode.code;
}

export async function getInviteCodeInfo(code) {
  // Check user codes
  const userCodes = await readJsonFile('./routes/userCodes.json');
  const userCode = userCodes.find(c => c.code === code);
  if (userCode) {
    return {
      type: 'user',
      data: userCode.practitionerId
    };
  }

  // Check admin codes
  const adminCodes = await readJsonFile('./routes/userAdminCodes.json');
  const adminCode = adminCodes.find(c => c.code === code);
  if (adminCode) {
    return {
      type: 'admin',
      data: adminCode.OrganizationId
    };
  }

  // Check new org codes
  const newOrgCodes = await readJsonFile('./routes/userNewOrgCodes.json');
  const newOrgCode = newOrgCodes.find(c => c.code === code);
  if (newOrgCode) {
    return {
      type: 'neworg',
      data: null
    };
  }

  return null;
}

export async function deleteInviteCode(code) {
  // Try to delete from all files
  let files = [
    { path: './routes/userCodes.json', key: 'code' },
    { path: './routes/userAdminCodes.json', key: 'code' },
    { path: './routes/userNewOrgCodes.json', key: 'code' }
  ];

  for (const file of files) {
    const codes = await readJsonFile(file.path);
    const initialLength = codes.length;
    const filteredCodes = codes.filter(c => c[file.key] !== code);
    
    if (filteredCodes.length < initialLength) {
      await writeJsonFile(file.path, filteredCodes);
      return true;
    }
  }
  
  return false;
}