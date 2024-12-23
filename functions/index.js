/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const cors = require("cors")({origin: true});
const {google} = require("googleapis");

// google auth
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const {authenticate} = require("@google-cloud/local-auth");
const SCOPES = ["https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.profile"];
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

// for interacting with requests
const {onRequest} = require("firebase-functions/v2/https");


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    console.log("Hello logs!");
    response.send("Hello from Firebase!");
  });
});

// --------------------------------------------------------------------AUTH
/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

// ------------------------------------------ END AUTH


exports.sendEmail = onRequest(async (req, res) => {
  // [END addmessageTrigger]
  // Grab the text parameter.
  const message = req.body;
  const encodedMessage = btoa(message);
  const reallyEncodedMessage = encodedMessage.replace(/\+/g, "-").
      replace(/\//g, "_").replace(/=+$/, "");

  const auth = await authorize();

  try {
    await sendMail(auth, reallyEncodedMessage);
  } catch (error) {
    return res.status(500).send("Failed to send email");
  }
  return res.status(200).send("Sent email");
});
/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {string} reallyEncodedMessage message for sending.
 *
 */
async function sendMail(auth, reallyEncodedMessage) {
  const gmail = google.gmail({version: "v1", auth});
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


// exports.sendEmail = functions.https.onRequest((request, response) => {
//   cors(request, response, () => {
//     const gmail = google.gmail({version: "v1", auth});
//     const message =
//       "From: " + request.query.from + "\r\n" +
//       "To: " + request.query.to + "\r\n" +
//       "Subject: " + request.query.subject + "\r\n\r\n" +
//       request.query.body;

//     // The body needs to be base64url encoded.
//     const encodedMessage = btoa(message);

//     const reallyEncodedMessage = encodedMessage.replace(/\+/g, "-").
//         replace(/\//g, "_").replace(/=+$/, "");

//     gmail.users.messages.send({
//       userId: "me",
//       resource: { // Modified
//         // same response with any of these
//         raw: reallyEncodedMessage,
//         // raw: encodedMessage
//         // raw: message
//       },
//     }).then(() => {
//       response.send("sent!");
//     }).catch((error) => {
//       response.error("Error sending email:", error);
//     });
//   });
// });
