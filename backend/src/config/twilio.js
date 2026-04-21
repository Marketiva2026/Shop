const twilio = require('twilio');

let client = null;

const getClient = () => {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

const sendSMS = async (to, body) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SMS DEMO] To: ${to} | Message: ${body}`);
    return { sid: 'DEMO_' + Date.now() };
  }
  const c = getClient();
  return c.messages.create({ body, from: process.env.TWILIO_PHONE, to });
};

module.exports = { sendSMS };
