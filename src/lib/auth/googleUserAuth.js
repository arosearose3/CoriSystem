// src/lib/auth/googleUserAuth.js

import { actions } from '$lib/stores.js';
import { writable } from 'svelte/store';
import { goto } from '$app/navigation';

/**
 * Writable store to manage user authentication errors.
 */
export const authError = writable(null);

/**
 * Checks the current user authentication status by querying the backend.
 * Updates the user store based on the response.
 *
 * @param {string} base - The base path of the application.
 * @returns {Promise<boolean>} - Returns true if authenticated, else false.
 */
export async function checkUserAuthStatus(base) {
  console.log('Checking user authentication status with base:', base);
  try {
    const response = await fetch(`${base}/auth/user`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include credentials if necessary
    });

    if (response.ok) {
      const data = await response.json();
      console.log('userAuth.js checkAuthStates User data received:', data);

      // Update the user store with received data
      if (data.user) {
      actions.setUser({
        id: data.user.id || null,
        email: data.user.email || null,
        name: data.user.name || null,
        picture: data.user.picture || null,
        roles: data.user.roles || [], // Ensure roles are included
      });

      console.log('User store updated.');
      console.log('User store updated.');
    } else {
      console.error('User data is null or undefined');
      actions.clearUserStore(); // Clear user store
    }
    return true; // User is authenticated
  } else {
    console.log('User is not authenticated. Status:', response.status);
    actions.clearUserStore(); // Clear user store
    return false; // User is not authenticated
  }
  } catch (error) {
    console.error('Error while checking user authentication status:', error);
    actions.clearUserStore(); // Clear user store on error
    authError.set('Failed to verify authentication status.');
    return false;
  }
}

/**
 * Logs out the user by calling the backend logout endpoint.
 * @param {string} base - The base path of the application.
 */
export async function logoutGoogleUser(base) {
  console.log('Logging out user with base:', base);
  try {
    const response = await fetch(`${base}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Include credentials if necessary
    });

    if (response.ok) {
      actions.clearUserStore();
      console.log('User logged out successfully.');
      goto(`${base}/`); // Redirect to home or login page
    } else {
      const errorMsg = await response.text();
      throw new Error(`Logout failed: ${response.status} ${response.statusText} - ${errorMsg}`);
    }
  } catch (error) {
    console.error('Error during logout:', error);
    authError.set('Logout failed. Please try again.');
  }
}
