// this all supports the Exclusion feature

import { writable, derived } from 'svelte/store';

// Core data stores
export const practitionersStore = writable([]);
export const exclusionProvidersStore = writable([]);
export const organizationIdStore = writable(null);

// Normalization helpers
function normalizeName(name = '') {
    return name.trim().toLowerCase();
}

function normalizeDOB(dob = '') {
    return formatDateToFHIR(dob);
}

function normalizeNPI(npi = '') {
    return npi.replace(/\D/g, '');
}


function formatDateToFHIR(dateStr) {
    if (!dateStr) return '';
    
    try {
        // Handle different input formats
        let date;
        
        // Clean the input string
        dateStr = dateStr.trim();
        
        if (dateStr.includes('/')) {
            // Handle MM/DD/YYYY
            const [month, day, year] = dateStr.split('/');
            date = new Date(year, month - 1, day);
        } else if (dateStr.includes('-')) {
            // Already YYYY-MM-DD or MM-DD-YYYY
            const parts = dateStr.split('-');
            if (parts[0].length === 4) {
                // Already YYYY-MM-DD
                return dateStr;
            } else {
                // MM-DD-YYYY
                date = new Date(parts[2], parts[0] - 1, parts[1]);
            }
        } else {
            return '';
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            return '';
        }

        // Format to YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('Date formatting error:', error);
        return '';
    }
}


// Enhanced practitioners helper with ID management
export const practitionersHelper = {
    getActionsToPerform: () => {
        let providers;
        let organizationId;
        let currentPractitioners;
        
        exclusionProvidersStore.subscribe(value => providers = value)();
        organizationIdStore.subscribe(value => organizationId = value)();
        practitionersStore.subscribe(value => currentPractitioners = value)();

        // Find matching practitioner IDs for each action
        function findMatchingPractitioner(provider) {
            return currentPractitioners.find(p => 
                normalizeName(p.firstName) === normalizeName(provider.firstName) &&
                normalizeName(p.lastName) === normalizeName(provider.lastName)
            );
        }
        
        return {
            organizationId,
            toAdd: providers.filter(p => p.addToCori).map(p => ({
                firstName: p.firstName,
                lastName: p.lastName,
                dob: p.dob,
                npi: p.npi,
                organizationId // Include organizationId for new practitioners
            })),
            toDelete: providers.filter(p => p.deleteFromCori).map(p => {
                const matchingPractitioner = findMatchingPractitioner(p);
                return {
                    firstName: p.firstName,
                    lastName: p.lastName,
                    dob: p.dob,
                    npi: p.npi,
                    practitionerId: matchingPractitioner?.id,
                    practitionerRoleId: matchingPractitioner?.roleId
                };
            }),
            toUpdateDOB: providers.filter(p => p.importDOB).map(p => {
                const matchingPractitioner = findMatchingPractitioner(p);
                return {
                    firstName: p.firstName,
                    lastName: p.lastName,
                    dob: p.dob,
                    practitionerId: matchingPractitioner?.id
                };
            }),
            toUpdateNPI: providers.filter(p => p.importNPI).map(p => {
                const matchingPractitioner = findMatchingPractitioner(p);
                return {
                    firstName: p.firstName,
                    lastName: p.lastName,
                    npi: p.npi,
                    practitionerId: matchingPractitioner?.id
                };
            })
        };
    },

    setPractitioners: (practitioners) => {
        // Ensure ID fields are preserved
        const enrichedPractitioners = practitioners.map(p => ({
            ...p,
            id: p.id || p.practitionerId, // Handle both ID field names
            roleId: p.roleId || p.practitionerRoleId, // Handle both role ID field names
            birthDate: normalizeDOB(p.birthDate) 
        }));
        practitionersStore.set(enrichedPractitioners);
    },

    setOrganizationId: (orgId) => {
        organizationIdStore.set(orgId);
    },

    setExclusionProviders: (providers) => {
        let currentPractitioners;
        practitionersStore.subscribe(value => currentPractitioners = value)();

        const enrichedProviders = providers.map(provider => {
            const matchingPractitioner = currentPractitioners.find(p => 
                normalizeName(p.firstName) === normalizeName(provider.firstName) &&
                normalizeName(p.lastName) === normalizeName(provider.lastName)
            );

            const normalizedDOB = normalizeDOB(provider.dob);

            return {
                ...provider,
                dob: normalizedDOB,
                foundInCori: !!matchingPractitioner,
                dobMatches: false,
                npiMatches: false,
                addToCori: false,
                deleteFromCori: false,
                importDOB: false,
                importNPI: false,
                // Include matching IDs if found
                matchingPractitionerId: matchingPractitioner?.id || null,
                matchingPractitionerRoleId: matchingPractitioner?.roleId || null
            };
        });
        
        exclusionProvidersStore.set(enrichedProviders);
        practitionersHelper.evaluateProviders();
    },

    evaluateProviders: () => {
        let coriPractitioners;
        practitionersStore.subscribe(value => {
            coriPractitioners = value;
        })();

        exclusionProvidersStore.update(providers => 
            providers.map(provider => {
                const matchingCoriProvider = coriPractitioners.find(coriProvider => 
                    normalizeName(coriProvider.firstName) === normalizeName(provider.firstName) &&
                    normalizeName(coriProvider.lastName) === normalizeName(provider.lastName)
                );

                const foundInCori = !!matchingCoriProvider;
                const dobMatches = foundInCori && 
                    normalizeDOB(matchingCoriProvider.birthDate) === normalizeDOB(provider.dob);
   
                const npiMatches = foundInCori && 
                    normalizeNPI(matchingCoriProvider.npi) === normalizeNPI(provider.npi);

                return {
                    ...provider,
                    foundInCori,
                    dobMatches,
                    npiMatches,
                    importDOB: provider.importDOB && !dobMatches,
                    importNPI: provider.importNPI && !npiMatches,
                    // Update matching IDs
                    matchingPractitionerId: matchingCoriProvider?.id || null,
                    matchingPractitionerRoleId: matchingCoriProvider?.roleId || null
                };
            })
        );
    },

    // Existing toggle functions remain the same
    toggleAdd: (provider) => {
        exclusionProvidersStore.update(providers => 
            providers.map(p => {
                if (p === provider) {
                    return {
                        ...p,
                        addToCori: !p.addToCori,
                        deleteFromCori: false
                    };
                }
                return p;
            })
        );
    },

    toggleDelete: (provider) => {
        exclusionProvidersStore.update(providers => 
            providers.map(p => {
                if (p === provider) {
                    return {
                        ...p,
                        deleteFromCori: !p.deleteFromCori,
                        addToCori: false
                    };
                }
                return p;
            })
        );
    },

    toggleImportDOB: (provider) => {
        exclusionProvidersStore.update(providers => 
            providers.map(p => {
                if (p === provider) {
                    return {
                        ...p,
                        importDOB: !p.importDOB
                    };
                }
                return p;
            })
        );
    },

    toggleImportNPI: (provider) => {
        exclusionProvidersStore.update(providers => 
            providers.map(p => {
                if (p === provider) {
                    return {
                        ...p,
                        importNPI: !p.importNPI
                    };
                }
                return p;
            })
        );
    }
};

// Derived stores remain the same
export const showActionButton = derived(
    exclusionProvidersStore,
    $providers => $providers.some(p => 
        p.addToCori || p.deleteFromCori || p.importDOB || p.importNPI
    )
);

export const actionButtonText = derived(
    exclusionProvidersStore,
    $providers => {
        const hasAdd = $providers.some(p => p.addToCori);
        const hasDelete = $providers.some(p => p.deleteFromCori);
        const hasImport = $providers.some(p => p.importDOB || p.importNPI);
        
        const actions = [];
        if (hasAdd) actions.push('Add');
        if (hasDelete) actions.push('Delete');
        if (hasImport) actions.push('Import');
        
        return actions.length ? actions.join('/') + ' Providers' : '';
    }
);