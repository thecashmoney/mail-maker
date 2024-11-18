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
require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");
const process = require("process");
const {authenticate} = require("@google-cloud/local-auth");
// If modifying these scopes, delete token.json.
const SCOPES = ["https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/gmail.send"];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    console.log("Hello logs!");
    response.send("Hello from Firebase!");
  });
});

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

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {
  const gmail = google.gmail({version: "v1", auth});
  const message =
    "From: " + request.query.from + "\r\n" +
    "To: " + request.query.to + "\r\n" +
    "Subject: " + request.query.subject + "\r\n\r\n" +
    request.query.body;

  // The body needs to be base64url encoded.
  const encodedMessage = btoa(message);

  const reallyEncodedMessage = encodedMessage.replace(/\+/g, "-").
      replace(/\//g, "_").replace(/=+$/, "");

  gmail.users.messages.send({
    userId: "me",
    resource: { // Modified
      // same response with any of these
      raw: reallyEncodedMessage,
      // raw: encodedMessage
      // raw: message
    },
  }).then(() => {
    console.log("sent!");
  }).catch((error) => {
    console.error("Error sending email:", error);
  });
}

authorize().then(listLabels).catch(console.error);

exports.sendEmail = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
  });
});
