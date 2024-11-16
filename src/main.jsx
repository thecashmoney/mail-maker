import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { FirebaseAppProvider, FirestoreProvider, useFirestoreDocData, useFirestore, useFirebaseApp } from 'reactfire';
import App from './App.jsx'
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const firebaseConfig = {
  apiKey: "AIzaSyDruhafsII5ugYyEaitPWlfFQyUZpXr4ro",
  authDomain: "mail-maker-1b4d9.firebaseapp.com",
  projectId: "mail-maker-1b4d9",
  storageBucket: "mail-maker-1b4d9.firebasestorage.app",
  messagingSenderId: "440165704568",
  appId: "1:440165704568:web:66e5b19b938b9b69c0de8d",
  measurementId: "G-FSHGMFJHMF"
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FirebaseAppProvider firebaseConfig={firebaseConfig}>
      <App />
    </FirebaseAppProvider>
  </StrictMode>
)