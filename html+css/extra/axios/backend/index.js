import express from "express"
const axios = require('axios');
const fs = require('fs').promises; // Use promises version of fs for async/await

async function sendDataAndCaptureResponse() {
  try {
    // 1. Define the payload
    const payload = {
      title: 'New Post',
      body: 'This is the content of the post.',
      userId: 1
    };

    // 2. Make the POST request
    const response = await axios.post('https://jsonplaceholder.typicode.com/posts', payload);

    console.log('Acknowledgment received from server!');

    // 3. Format the data you want to save (converting the object to a pretty JSON string)
    const dataToSave = JSON.stringify({
      timestamp: new Date().toISOString(),
      status: response.status,
      statusText: response.statusText,
      responseData: response.data
    }, null, 2); // 2 spaces for indentation

    // 4. Write the response into responsecapture.txt
    await fs.writeFile('responsecapture.txt', dataToSave, 'utf-8');
    
    console.log('Successfully saved response to responsecapture.txt');

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

sendDataAndCaptureResponse();