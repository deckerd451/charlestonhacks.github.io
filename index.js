const functions = require('firebase-functions');
const axios = require('axios');

// Get the Mailchimp API key from the environment variables
const apiKey = functions.config().mailchimp.api_key;
const listId = 'YOUR_MAILCHIMP_LIST_ID';

exports.processNfcScan = functions.https.onRequest(async (req, res) => {
  const { name, email } = req.body;

  const data = {
    email_address: email,
    status: 'subscribed',
    merge_fields: {
      FNAME: name,
    },
  };

  try {
    const response = await axios.post(`https://us12.api.mailchimp.com/3.0/lists/${listId}/members`, data, {
      headers: {
        'Authorization': `Basic ${Buffer.from('anystring:' + apiKey).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    res.status(200).send('Success');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error');
  }
});
