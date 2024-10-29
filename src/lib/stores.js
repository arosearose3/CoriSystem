import { writable, get } from 'svelte/store';
import { AbilityBuilder, PureAbility } from '@casl/ability';
import { navItems } from '$lib/navConfig.js';
import { browser } from '$app/environment';

// Initialize PureAbility with an empty rule set
const initialAbilities = new PureAbility([]);



// Initial state for user and practitioner
const initialUserState = {
  user: {
    id: null,
    email: null,
    name: null,
    picture: null,
  },
  practitioner: {
    PRid: null, // this is the PractionerRoleId
    Pid: null,  // this is the id of the Practitioner Resource
    name: null,
    organizationId: null,
    organizationName: null,
    availability: null,
    
    sms: null,
    dob: null,
    npi: null,
    roles: [],
    practitionerRoles: [],
    localOrgArray: [],
  },
};

// Utility function to create a dummy writable store when not in the browser
function createDummyWritable(initialValue) {
  const { subscribe } = writable(initialValue);
  return {
    subscribe,
    set: () => {},  // no-op for set
    update: () => {}  // no-op for update
  };
}

function createSafeStore(initialValue) {
  if (!browser) {
    // During SSR, return a minimal store implementation
    return {
      subscribe: () => () => {},
      set: () => {},
      update: () => {}
    };
  }

  // In browser, return full writable store
  const store = writable(initialValue);
  return {
    subscribe: store.subscribe,
    set: (value) => {
      console.log('Setting store value:', value);
      store.set(value);
    },
    update: (updater) => {
      store.update((currentValue) => {
        const newValue = updater(currentValue);
        console.log('Updating store value:', newValue);
        return newValue;
      });
    }
  };
}

// Function to create a writable store with persistent storage
const createPersistentStore = (key, startValue) => {
  const store = writable(startValue);

  if (typeof window !== 'undefined') {
    const storedValue = localStorage.getItem(key);
    if (storedValue) {
      store.set(JSON.parse(storedValue));
    }

    store.subscribe(value => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }

  return {
    ...store,
    reset: () => {
      store.set(startValue);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    }
  };
};


export const user = createSafeStore(initialUserState);
export const abilities = createSafeStore(new PureAbility([]));
export const exc_uploadStatus = createSafeStore('');
export const exc_checkResults = createSafeStore([]);

export const isUserAuthenticated = createSafeStore(false);


console.log('Exporting user store:', user);
console.log('Exporting abilities store:', abilities);

export function updateAbilities(userRoles) {
  if (!userRoles || !Array.isArray(userRoles) || userRoles.length === 0) {
    console.warn('No valid user roles provided for updating abilities');
    return;
  }
  try {
    const { can, build } = new AbilityBuilder(PureAbility);

    navItems.forEach(item => {
      item.roles.forEach(role => {
        if (userRoles.includes(role)) {
          can('view', item.subject);
         // console.log(`Role '${role}' can view '${item.subject}'`);
        }

        if (item.subItems) {
          item.subItems.forEach(subItem => {
            if (userRoles.includes(role)) {
              can('view', subItem.subject);
        //      console.log(`Role '${role}' can view '${subItem.subject}'`);
            }
          });
        }
      });
    });

    const builtAbility = build();
    abilities.set(builtAbility);
    console.log("=== Abilities Updated ===");
  } catch (error) {
    console.error('Error updating abilities:', error);
  }
}

export function setUser(userData) {
  console.log('stores.js setUser called with:', userData);
  if (!userData || typeof userData !== 'object') {
    console.error('Invalid user data:', userData);
    return;
  }

  //console.log ("stores.js user.update userData",JSON.stringify(userData));

  user.update(store => {
    const updatedStore = {
      ...store,
      user: userData.user  // Store the entire user object as it comes from the server
    };
    console.log('Updated user store:', updatedStore);
    return updatedStore;
  });


  updateAbilities(userData.user?.roles || []);
}

export function setPractitioner(practitionerData) {
  if (!practitionerData || typeof practitionerData !== 'object') {
    console.error('Invalid practitioner data:', practitionerData);
    return;
  }

  user.update(store => ({
    ...store,
    practitioner: {
      ...store.practitioner,
      ...practitionerData,
      roles: Array.isArray(practitionerData.roles) ? practitionerData.roles : [],
    },
  }));

  updateAbilities(practitionerData.roles || []);
}

export function clearUserStore() {
  // Reset the user to the initial state (e.g., null)
  user.set(null); 
  
  // Reset abilities
  abilities.set(new PureAbility([]));
}

export function clearFhirStore() {
  user.update(store => ({
    ...store,
    practitioner: initialUserState.practitioner,
  }));
}

export const actions = {
  setUser,
  setPractitioner,
  clearUserStore,
  clearFhirStore,
  updateAbilities,
};

export function hasFetchedPractitionerData() {
  if (!browser) return false;
  let result = false;
  try {
    const store = get(user);
    result = store?.practitioner?.Pid !== null;
  } catch (error) {
    console.error('Error checking practitioner data:', error);
  }
  return result;
}
