<script>
    import { onMount } from 'svelte';
    import { base } from '$app/paths';
    import { fade, slide } from 'svelte/transition';

    
    export let practitionerId;
    export let onClose = () => {};
    
    let practitioner = {
        name: [{ family: '', given: [''] }],
        birthDate: '',
        gender: 'unknown',
        telecom: [
            { system: 'phone', value: '' },
            { system: 'email', value: '' }
        ],
        address: [{ 
            line: [''],
            city: '',
            state: '',
            postalCode: ''
        }]
        };
    
    let practitionerRoles = [];
    let organizations = new Map();
    let isLoading = true;
    let message = '';
    let error = '';

    let deletingRoleId = null;
    let roleError = ''; // Specific error for role operations

  
    onMount(async () => {
      await Promise.all([
        fetchPractitioner(),
        fetchPractitionerRoles()
      ]);
      isLoading = false;
    });
  
    function ensurePractitionerStructure(data) {
        return {
            ...data,
            name: data.name || [{ family: '', given: [''] }],
            birthDate: data.birthDate || '',
            gender: data.gender || 'unknown',
            telecom: data.telecom || [
            { system: 'phone', value: '' },
            { system: 'email', value: '' }
            ],
            address: data.address || [{ 
            line: [''],
            city: '',
            state: '',
            postalCode: ''
            }]
        };
        }

    async function fetchPractitioner() {
        try {
            const response = await fetch(`${base}/api/practitioner/${practitionerId}`);
            if (!response.ok) throw new Error('Failed to fetch practitioner');
            const data = await response.json();
            practitioner = ensurePractitionerStructure(data);
        } catch (err) {
            error = 'Failed to load practitioner data';
            console.error(err);
        }
        }
        
    async function fetchPractitionerRoles() {
      try {
       

        const response = await fetch(`${base}/api/role/PractitionerRole?practitioner=${encodeURIComponent(practitionerId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
        if (!response.ok) throw new Error('Failed to fetch roles');
        const data = await response.json();
        
        practitionerRoles = data.entry ? data.entry.map(e => e.resource) : [];
        
        // Fetch organization names
        await Promise.all(
          practitionerRoles.map(async role => {
            if (role.organization?.reference) {
              const orgName = await fetchOrganizationName(role.organization.reference);
              organizations.set(role.organization.reference, orgName);
            }
          })
        );
        organizations = organizations; // Trigger Svelte reactivity
      } catch (err) {
        error = 'Failed to load practitioner roles';
        console.error(err);
      }
    }
  
    async function fetchOrganizationName(reference) {
        try {
            const response = await fetch(`${base}/api/organization/getOrgName?reference=${encodeURIComponent(reference)}`);
            if (!response.ok) throw new Error('Failed to fetch organization name');
            const text = await response.text();
            return text.replace(/^"|"$/g, ''); // Removes leading and trailing quotes
        } catch (err) {
            return 'Unknown Organization';
        }
        }
  
    async function handleSubmit() {
      try {
        const response = await fetch(`${base}/api/practitioner/update/${practitionerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(practitioner)
        });
        
        if (response.ok) {
          message = 'Practitioner updated successfully!';
          setTimeout(() => onClose(), 1500);
        } else {
          throw new Error('Failed to update practitioner');
        }
      } catch (err) {
        error = 'Failed to update practitioner';
        console.error(err);
      }
    }

    function getTelecomValue(system) {
    const entry = practitioner.telecom?.find(t => t.system === system);
    return entry ? entry.value : '';
  }

  function setTelecomValue(system, value) {
    const index = practitioner.telecom?.findIndex(t => t.system === system);
    if (index >= 0) {
      practitioner.telecom[index].value = value;
    } else {
      practitioner.telecom = [...(practitioner.telecom || []), { system, value }];
    }
    practitioner = practitioner; // Trigger Svelte reactivity
  }

  async function confirmDeleteRole(roleId) {
  deletingRoleId = roleId;
}

async function deletePractitionerRole(roleId) {
  try {
    const response = await fetch(`${base}/api/role/PractitionerRole/${roleId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to delete practitioner role');
    }

    // Remove the role from local state
    practitionerRoles = practitionerRoles.filter(role => role.id !== roleId);
    deletingRoleId = null; // Reset confirmation state
    roleError = ''; // Clear any previous errors

  } catch (err) {
    roleError = 'Failed to delete practitioner role';
    console.error(err);
  }
}

function cancelDelete() {
  deletingRoleId = null;
  roleError = '';
}

  </script>
  
  <div class="modal-backdrop">
    <div class="modal-content">
      {#if isLoading}
        <div class="loading">Loading...</div>
      {:else}
        <h2>Edit Practitioner</h2>
        
        <form on:submit|preventDefault={handleSubmit}>
          <div class="form-section">
            <h3>Basic Information</h3>
            <!-- Name fields with null checks -->
            <div class="form-group">
                <label>First Name</label>
                <input 
                  type="text" 
                  value={practitioner.name?.[0]?.given?.[0] ?? ''}
                  on:input={e => {
                    if (!practitioner.name) practitioner.name = [{ given: [''] }];
                    if (!practitioner.name[0].given) practitioner.name[0].given = [''];
                    practitioner.name[0].given[0] = e.target.value;
                    practitioner = practitioner;
                  }}
                  required 
                />
              </div>
            
            <div class="form-group">
                <label>Last Name</label>
                <input 
                  type="text" 
                  value={practitioner.name?.[0]?.family ?? ''}
                  on:input={e => {
                    if (!practitioner.name) practitioner.name = [{}];
                    practitioner.name[0].family = e.target.value;
                    practitioner = practitioner;
                  }}
                  required 
                />
              </div>
            
              <div class="form-group">
                <label>Birth Date</label>
                <input 
                  type="date" 
                  value={practitioner.birthDate ?? ''}
                  on:input={e => {
                    practitioner.birthDate = e.target.value;
                    practitioner = practitioner;
                  }}
                  required 
                />
              </div>

            <div class="form-group">
                <label>Gender</label>
                <select 
                    value={practitioner.gender ?? 'unknown'}
                    on:change={e => {
                    practitioner.gender = e.target.value;
                    practitioner = practitioner;
                    }}
                >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="unknown">Unknown</option>
                </select>
                </div>
          </div>
  
          <div class="form-section">
            <h3>Contact Information</h3>
            <div class="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={getTelecomValue('phone')}
                on:input={e => setTelecomValue('phone', e.target.value)}
              />
            </div>
            
            <div class="form-group">
              <label>Email</label>
              <input
                type="email"
                value={getTelecomValue('email')}
                on:input={e => setTelecomValue('email', e.target.value)}
              />
            </div>
          </div>
  
          <div class="form-section">
            <h3>Address</h3>
            <!-- Address fields with null checks -->
            <div class="form-group">
              <label>Street Address</label>
              <input 
                type="text" 
                value={practitioner.address?.[0]?.line?.[0] ?? ''}
                on:input={e => {
                  if (!practitioner.address) practitioner.address = [{}];
                  if (!practitioner.address[0].line) practitioner.address[0].line = [''];
                  practitioner.address[0].line[0] = e.target.value;
                  practitioner = practitioner;
                }}
              />
            </div>
            
            <div class="form-group">
              <label>City</label>
              <input 
                type="text" 
                value={practitioner.address?.[0]?.city ?? ''}
                on:input={e => {
                  if (!practitioner.address) practitioner.address = [{}];
                  practitioner.address[0].city = e.target.value;
                  practitioner = practitioner;
                }}
              />
            </div>
            
            <div class="form-group">
              <label>State</label>
              <input 
                type="text" 
                value={practitioner.address?.[0]?.state ?? ''}
                on:input={e => {
                  if (!practitioner.address) practitioner.address = [{}];
                  practitioner.address[0].state = e.target.value;
                  practitioner = practitioner;
                }}
              />
            </div>
            
            <div class="form-group">
              <label>Postal Code</label>
              <input 
                type="text" 
                value={practitioner.address?.[0]?.postalCode ?? ''}
                on:input={e => {
                  if (!practitioner.address) practitioner.address = [{}];
                  practitioner.address[0].postalCode = e.target.value;
                  practitioner = practitioner;
                }}
              />
            </div>
          </div>
       

          <div class="form-section">
            <h3>Organization Roles</h3>
            {#if roleError}
              <div class="error-message" transition:fade>
                {roleError}
                <button class="close-error" on:click={() => roleError = ''}>×</button>
              </div>
            {/if}
            {#if !practitionerRoles?.length}
              <p>No roles assigned</p>
            {:else}
            <div class="roles-list">
                {#each practitionerRoles as role (role.id)}
                  <div class="role-item" transition:slide|local>
                    <div class="role-header">
                      {#if deletingRoleId === role.id}
                        <div class="confirmation-dialog" transition:fade|local>
                          <span>Delete this role?</span>
                          <div class="confirmation-buttons">
                            <button 
                              class="confirm-btn"
                              on:click={() => deletePractitionerRole(role.id)}
                            >
                              Yes
                            </button>
                            <button 
                              class="cancel-btn"
                              on:click={cancelDelete}
                            >
                              No
                            </button>
                          </div>
                        </div>
                      {:else}
                        <button 
                          class="delete-role-btn" 
                          on:click={() => confirmDeleteRole(role.id)}
                          aria-label="Delete role"
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            stroke-width="2" 
                            stroke-linecap="round" 
                            stroke-linejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                        <strong>{organizations.get(role.organization?.reference) || 'Unknown Organization'}</strong>
                      {/if}
                    </div>
                    <ul>
                      {#if role.code?.length}
                        {#each role.code as codeEntry}
                          {#if codeEntry.coding?.length}
                            {#each codeEntry.coding as coding}
                              <li>{coding.display || coding.code || 'Unknown Role'}</li>
                            {/each}
                          {/if}
                        {/each}
                      {/if}
                    </ul>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

                  <!-- Button Group -->
        <div class="button-group">
            <button type="submit" class="submit-btn">Save Changes</button>
            <button type="button" class="cancel-btn" on:click={onClose}>Cancel</button>
          </div>
        </form>
  
        {#if message}
          <div class="success-message">{message}</div>
        {/if}
        
        {#if error}
          <div class="error-message">{error}</div>
        {/if}
      {/if}
    </div>
  </div>
  
  <style>
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
  
    .modal-content {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
  
    .form-section {
      margin-bottom: 2rem;
      padding: 1rem;
      border: 1px solid #eee;
      border-radius: 4px;
    }
  
    h2 {
      margin-bottom: 1.5rem;
      color: #333;
    }
  
    h3 {
      margin-bottom: 1rem;
      color: #666;
    }
  
    .form-group {
      margin-bottom: 1rem;
    }
  
    label {
      display: block;
      margin-bottom: 0.5rem;
      color: #555;
    }
  
    input, select {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
  
    .roles-list {
      display: grid;
      gap: 1rem;
    }
  
    .role-item {
      padding: 1rem;
      background: #f9f9f9;
      border-radius: 4px;
    }
  
    .role-item ul {
      margin-top: 0.5rem;
      padding-left: 1.5rem;
    }
  
    .button-group {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }
  
    .submit-btn, .cancel-btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
  
    .submit-btn {
      background: #4CAF50;
      color: white;
    }
  
    .submit-btn:hover {
      background: #45a049;
    }
  
    .cancel-btn {
      background: #f44336;
      color: white;
    }
  
    .cancel-btn:hover {
      background: #da190b;
    }
  
    .success-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 4px;
    }
  
    .error-message {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #ffebee;
      color: #c62828;
      border-radius: 4px;
    }
  
    .loading {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    .confirmation-dialog {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  background-color: #fff3cd;
  border-radius: 4px;
  width: 100%;
}

.confirmation-buttons {
  display: flex;
  gap: 0.5rem;
}

.confirm-btn, .cancel-btn {
  padding: 0.25rem 0.75rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.confirm-btn {
  background-color: #dc3545;
  color: white;
}

.confirm-btn:hover {
  background-color: #c82333;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.close-error {
  background: none;
  border: none;
  color: inherit;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 0.5rem;
  margin-left: auto;
}



.role-item {
  transition: all 0.3s ease;
}

  </style>