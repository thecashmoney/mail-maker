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

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

exports.helloWorld = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    console.log("Hello logs!");
    response.send("Hello from Firebase!");
  });
});

exports.sendEmail = functions.https.onRequest((request, response) => {
  cors(request, response, () => {
    const message =
      "From: " + request.query.from + "\r\n" +
      "To: " + request.query.to + "\r\n" +
      "Subject: " + request.query.subject + "\r\n\r\n" +
      request.query.body;

    // The body needs to be base64url encoded.
    const encodedMessage = btoa(message);

    const reallyEncodedMessage = encodedMessage.replace(/\+/g, "-").
        replace(/\//g, "_").replace(/=+$/, "");

    gapi.client.gmail.users.messages.send({
      userId: "me",
      resource: { // Modified
        // same response with any of these
        raw: reallyEncodedMessage,
        // raw: encodedMessage
        // raw: message
      },
    }).then(() => {
      response.send("sent!");
    }).catch((error) => {
      response.error("Error sending email:", error);
    });
  });
});
