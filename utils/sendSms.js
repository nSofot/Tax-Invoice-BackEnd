import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// export async function sendSMS(to, message) {
//   return client.messages.create({
//     body: message,
//     from: process.env.TWILIO_PHONE_NUMBER,
//     to: to,
//   });
// }
export async function sendSMS(to, message) {
  try {
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log("SMS sent:", response.sid);
    return response;
  } catch (error) {
    console.error("SMS failed:", error.message);
    throw error;
  }
}