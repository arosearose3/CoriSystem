import axios from 'axios';

const BASE_URL = 'https://elig.pro/avail/prod/api/practitioner';

async function removeUnknownPractitioners() {
  try {
    console.log('Starting removal of practitioner...');

    const response = await axios.delete(`${BASE_URL}/removeUnknown`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log(response.data.message);
      console.log(`Number of practitioners deleted: ${response.data.deletedCount}`);
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

removeUnknownPractitioners()
  .then(() => console.log('Script completed'))
  .catch(error => console.error('Script failed:', error));