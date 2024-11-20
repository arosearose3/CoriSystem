import axios from 'axios';

const BASE_URL = 'https://elig.pro/avail/prod/api/role';

async function removePractitionerRoleById(practitionerRoleId) {
  try {
    console.log(`Starting removal of PractitionerRole with ID: ${practitionerRoleId}...`);

    const response = await axios.delete(`${BASE_URL}/delete`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      params: {
        practitionerRoleId // Send the practitionerRoleId as a query parameter
      }
    });

    if (response.status === 200) {
      console.log(response.data.message);
      console.log(`PractitionerRole with ID ${practitionerRoleId} deleted successfully.`);
    } else {
      console.error('Unexpected response status:', response.status);
      console.error('Response data:', response.data);
    }
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response from server:', error.response.data);
      console.error('Status code:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
  }
}

// Replace 'somePractitionerRoleId' with the actual PractitionerRole ID you want to delete
removePractitionerRoleById('776adfbf-dbb1-4eba-ae99-df7a7b9779fa')
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error));
