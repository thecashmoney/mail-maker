/* eslint-disable require-jsdoc */
/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {google} = require("googleapis");
// for interacting with requests
const {onRequest} = require("firebase-functions/v2/https");


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// const functions = require("firebase-functions");
// const cors = require("cors")({origin: true});
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   cors(request, response, () => {
//     console.log("Hello logs!");
//     response.send("Hello from Firebase!");
//   });
// });

exports.sendEmail = onRequest( {cors: true},
    async (req, res) => {
      const message = req.body.body;
      const token = req.body.token;
      const encodedMessage = Buffer.from(message).toString("base64");
      const reallyEncodedMessage = encodedMessage.replace(/\+/g, "-").
          replace(/\//g, "_").replace(/=+$/, "");
      try {
        await sendMail(token, reallyEncodedMessage);
      } catch (error) {
        return res.status(500).send("Failed to send email: " + error.message);
      }
      return res.status(200).send("called successfully");
    });

async function sendMail(token, reallyEncodedMessage) {
  // make client
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({access_token: token});

  const gmail = google.gmail({version: "v1", auth: oauth2Client});
  gmail.users.messages.send({
    userId: "me",
    resource: {
      raw: reallyEncodedMessage,
    },
  }).then(() => {
    console.log("sent!");
  }).catch((error) => {
    console.error("Error sending email:", error);
  });
}

const admin = require("firebase-admin");
admin.initializeApp();

exports.getSheetsKey = onRequest( {cors: true},
    async (req, res) => {
      const idToken = req.get("Authorization"); // Get token from Bearer

      if (!idToken) {
        return res.status(401).send("Unauthorized");
      }

      try {
        // Verify the Firebase ID token
        await admin.auth().verifyIdToken(idToken);

        // If token is valid, proceed to return the key
        const key = "AIzaSyD-8UDde4DWQLVb_6ABwvio8a4xxAJ6iLM";
        res.status(200).send(key);
      } catch (error) {
        res.status(401).send("Unauthorized");
      }
    },
);

