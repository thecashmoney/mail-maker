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

// google auth
// const fs = require("fs").promises;
// const path = require("path");
// const process = require("process");
// const {authenticate} = require("@google-cloud/local-auth");
// const SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.profile"];
// const TOKEN_PATH = path.join(process.cwd(), "token.json");
// const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

// for interacting with requests
const {onRequest} = require("firebase-functions/v2/https");
// const axios = require("axios");


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

// // --------------------------------------------------------------------AUTH
// /**
//  * Reads previously authorized credentials from the save file.
//  *
//  * @return {Promise<OAuth2Client|null>}
//  */
// async function loadSavedCredentialsIfExist() {
//   try {
//     const content = await fs.readFile(TOKEN_PATH);
//     const credentials = JSON.parse(content);
//     return google.auth.fromJSON(credentials);
//   } catch (err) {
//     return null;
//   }
// }

// /**
//  * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
//  *
//  * @param {OAuth2Client} client
//  * @return {Promise<void>}
//  */
// async function saveCredentials(client) {
//   const content = await fs.readFile(CREDENTIALS_PATH);
//   const keys = JSON.parse(content);
//   const key = keys.installed || keys.web;
//   const payload = JSON.stringify({
//     type: "authorized_user",
//     client_id: key.client_id,
//     client_secret: key.client_secret,
//     refresh_token: client.credentials.refresh_token,
//   });
//   await fs.writeFile(TOKEN_PATH, payload);
// }

// /**
//  * Load or request or authorization to call APIs.
//  *
//  */
// async function authorize() {
//   let client = await loadSavedCredentialsIfExist();
//   if (client) {
//     return client;
//   }
//   client = await authenticate({
//     scopes: SCOPES,
//     keyfilePath: CREDENTIALS_PATH,
//   });
//   if (client.credentials) {
//     await saveCredentials(client);
//   }
//   return client;
// }
// // ------------------------------------------ END AUTH


exports.sendEmail = onRequest( {cors: true},
    async (req, res) => {
      const message = req.body.body;
      const token = req.body.code;
      const encodedMessage = Buffer.from(message).toString("base64");
      const reallyEncodedMessage = encodedMessage.replace(/\+/g, "-").
          replace(/\//g, "_").replace(/=+$/, "");

      // await receiveToken(code);

      // const token = await fs.readFile(TOKEN_PATH);
      try {
        await sendMail(token, reallyEncodedMessage);
      } catch (error) {
        return res.status(500).send("Failed to send email: " + error.message);
      }
      return res.status(200).send("sent successfully");
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

// async function receiveToken(code) {
//   const content = await fs.readFile(CREDENTIALS_PATH);
//   const keys = JSON.parse(content);
//   const key = keys.installed || keys.web;

//   const payload = {
//     "grant_type": "authorization_code",
//     "code": code,
//     "client_id": key.client_id,
//     "client_secret": key.client_secret,
//     "redirect_uri": "localhost:5173/mail-maker",
//   };

//   const res = await axios.post("https://oauth2.googleapis.com/token", payload);
//   await fs.writeFile(TOKEN_PATH, res.data);
// }
