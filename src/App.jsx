"use strict";
import { useState, useEffect } from 'react'
import './App.css'
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useAuth, useSigninCheck, FirebaseAppProvider, FirestoreProvider, useFirestoreDocData, useFirestore, useFirebaseApp, AuthProvider } from 'reactfire';
import { getAuth } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

var token;
const signOut = auth => auth.signOut().then(() => console.log('signed out'));
const signIn = async auth => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    signInWithPopup(auth, provider).then((result) => {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential.accessToken;
        Object.freeze(token);
    });
}


function Auth() {
    const { status, data: signinResult } = useSigninCheck();

    if (status === 'loading') {
        return <p>loading !!!</p>;
    }

    const { signedIn, user } = signinResult;
    if (signedIn) {
        return (<SignedInHTML user={user} token={token}/>);
    } else return (<SignedOutHTML />);
}

function App() {
    const firebaseApp = useFirebaseApp();
    const auth = getAuth(firebaseApp);
    return (
        <AuthProvider sdk={auth}>
            <Auth />
        </AuthProvider>
    )
}

function SignedInHTML({ user, token }) {
    const auth = useAuth();
    const [formValues, setFormValues] = useState({
        email: '',
        subject: '',
        body: ''
    });

    const handleFormChange = (event) => {
        const { name, value } = event.target;
        setFormValues(prevValues => ({
            ...prevValues,
            [name]: value
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
    };

    const sendEmail = async () => {
        const code = token;
        const { email, subject, body } = formValues;
        const message =
            "From: " + user.email + "\r\n" + 
            "To: " + formValues.email + "\r\n" +
            "Subject: " + formValues.subject + "\r\n\r\n" +
            formValues.body;
        try {
            //make payload
            const payload = {
                code: code,
                body: message,
            };
            // const response = await fetch('https://sendemail-niisnxz5da-uc.a.run.app', {
            const response = await fetch('http://127.0.0.1:5001/mail-maker-1b4d9/us-central1/sendEmail', {   //for debug on local side
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });
    
            if (response.ok) {
                const result = await response;
                console.log('Email sent:', result);
            } else {
                const error = await response;
                console.error('Error sending email:', error);
            }
        } catch (error) {
            console.error('Error calling Firebase function:', error);
        }
    };

    return <div>
        <nav>
            <div class="navitems">
                <div class="left">
                    <a href="/" class="home-link">logo</a>
                </div>
                <div class="right">
                    <p class="rightitem">hi {user.displayName.split(' ')[0].toLowerCase()} !!!! ({user.email})</p>
                    <img src={user.photoURL} alt="user image" class="profile-pic" />
                </div>
            </div>
        </nav>
        <br /><br />
        <h2>draft your email here !!</h2>
        <br />
        <form onSubmit={handleSubmit}>
            <Box //for email, subject lines
                component="form"
                sx={{ '& > :not(style)': { m: 1, width: '25ch' } }}
                noValidate
                autoComplete="off"
            >
                <TextInput
                    name="email"
                    label="email"
                    id="outlined"
                    value={formValues.email}
                    onChange={handleFormChange}
                />
                <TextInput
                    name="subject"
                    label="subject"
                    id="outlined"
                    value={formValues.subject}
                    onChange={handleFormChange}
                />

            </Box>
            <Box  //for body
                component="form"
                sx={{ '& > :not(style)': { m: 1, width: '52ch' } }}
                noValidate
                autoComplete="off"
            >
                <TextInput
                    name="body"
                    id="outlined-multiline-static"
                    label="body"
                    multiline
                    rows={4}
                    onChange={handleFormChange}
                />
            </Box>
        </form>
        <button onClick={sendEmail}>send !!!</button>
        <br /><br />
        <button onClick={() => signOut(auth)}>sign out !!</button>
    </div>
}

function SignedOutHTML() {
    const auth = useAuth();
    return <div>
        <h2>mail maker !!!!</h2>
        <br />
        <h3>give a template, and we'll mass send emails!</h3>
        <br />
        <button onClick={() => signIn(auth)}>sign in !!! (requires google account access) 🚀</button>

        <br /><br /><br />
        <h3>NOTE</h3>
        <p>Google will warn you that this is an unverified app. This is because our app will gain permission to send emails through your account. We will <b>only</b> use this power to send out group emails through your account and <b>nothing else.</b> Please continue with the app to be able to use it. It is hard for me to get verified because of the hard requirements (I need to make a privacy policy !!!! 😭)</p>
    </div>
}

export default App;


function TextInput({ name, label, id, value, onChange, multiline = false, rows = 4 }) {
    return (
        <TextField
            name={name}
            label={label}
            id={id}
            value={value}
            onChange={onChange}
            multiline={multiline}
            rows={rows}
            sx={{
                '& label': {
                    color: '#A0AAB4',
                },
                '& label.Mui-focused': {
                    color: '#A0AAB4',
                },
                '& .MuiInput-underline:after': {
                    borderBottomColor: '#B2BAC2',
                },
                input: {
                    color: 'white',
                },
                '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                        borderColor: '#E0E3E7',
                    },
                    '&:hover fieldset': {
                        borderColor: '#B2BAC2',
                    },
                    '&.Mui-focused fieldset': {
                        borderColor: '#6F7E8C',
                    },
                    '& textarea': {
                        color: 'white', // Change text color inside the textarea
                    },
                },
            }}
        />
    );
}

export function Functions() {
    const app = useFirebaseApp();

    return (
        <FunctionsProvider sdk={getFunctions(app)}>
            <UpperCaser />
        </FunctionsProvider>
    );
}