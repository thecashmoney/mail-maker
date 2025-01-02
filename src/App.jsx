"use strict";
import { useState, useEffect } from 'react'
import './App.css'
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material';
import { useAuth, useSigninCheck, FirebaseAppProvider, FirestoreProvider, useFirestoreDocData, useFirestore, useFirebaseApp, AuthProvider } from 'reactfire';
import { getAuth } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

var token;
const signOut = auth => auth.signOut().then(() => console.log('signed out'));
const signIn = async auth => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    provider.addScope('https://www.googleapis.com/auth/documents.readonly');
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
        body: '',
        range: '',
        templateLink: '',
    });


    const [sheet, setSheet] = useState(false);
    const [templateStatus, setTemplate] = useState('template');

    // Handle checkbox change
    const handleSheetChange = (event) => {
        setSheet(event.target.checked);
    };

    const handleTemplateChange = (event, newTemplateStatus) => {
        setTemplate(newTemplateStatus);
    }

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

    const [buttonText, setButtonText] = useState('send !!!');

    async function getSheet() {
        try {
            //look for spreadsheet id
            const regex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;
            const match = formValues.email.match(regex);
            console.log("Spreadsheet ID: ", match[1]);

            //receive apikey for calling
            let key;
            const idToken = await user.getIdToken(/* forceRefresh */ true);
            // const keyRaw = await fetch ('http://127.0.0.1:5001/mail-maker-1b4d9/us-central1/getSheetsKey', { //local
            const keyRaw = await fetch ('https://us-central1-mail-maker-1b4d9.cloudfunctions.net/getSheetsKey', { //deployed
                method: 'GET',
                headers: {
                    'Authorization': idToken,
                }
            });
            if (keyRaw.ok) console.log("Authorized!");
            else console.error("Unauthorized");

            key = await keyRaw.text();
            Object.freeze(key);


            //receive spreadsheet data
            const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + match[1] + '/values/'+ formValues.range +'?key='+ key, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            const data = await response.json();
            const emails = data.values;
            let emailString;
            for (let i = 0; i < emails.length; i++) {
                for (let j = 0; j < emails[i].length; j++) {
                    if (i == 0 && j == 0) emailString = emails[0][0] + ", ";
                    else emailString = emailString + emails[i][j] + ", ";
                }
            }
            console.log("Sending to: ", emailString);
            return emailString;
        }
        catch {
            console.error("Error calling gapi:");
            return "";
        }
    }

    async function getTemplate() {
        try {
            //look for spreadsheet id
            const regex = /https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;
            const match = formValues.templateLink.match(regex);
            console.log("Template ID: ", match[1]);
            //receive template data
            const response = await fetch('https://docs.googleapis.com/v1/documents/' + match[1], {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                }
            })
            const data = await response.json();
            let message = "";
            console.log("Loaded", data.title);
            data.body.content.forEach(function(element) {
                if (element.paragraph) {
                    element.paragraph.elements.forEach(function(paragraphElement) {
                        if (paragraphElement.textRun) {
                            const textContent = paragraphElement.textRun.content;
                            const textStyle = paragraphElement.textRun.textStyle;

                            let fragment = textContent;

                            if (textStyle.bold) fragment = '<b>' + fragment + '</b>';
                            if (textStyle.italic) fragment = '<i>' + fragment + '</i>';
                            if (textStyle.underline) fragment = '<u>' + fragment + '</u>';
                            if (textStyle.link) {
                                const url = textStyle.link.url;
                                fragment = '<a href="' + url + '" target="_blank">' + fragment + '</a>';
                            }
                            message += fragment
                        }
                    });
                    message += "<br>";
                }
            });
            console.log(message);
            return message;
        }
        catch {
            console.error("Error reading template:");
            return "";
        }
    }

    const sendEmail = async () => {
        const { email, subject, body } = formValues;
        console.log("Sheet: ", sheet);
        let toEmail;
        if (!sheet) {
            toEmail = formValues.email;
        }
        else {
            toEmail = await getSheet();
        }
        let message;
        if (templateStatus == "template") {
            const templateBody = await getTemplate();
            message =
            "Content-Type: text/html; charset=UTF-8 \r\n" +
            "To: " + toEmail + "\r\n" +
            "Subject: " + formValues.subject + "\r\n\r\n" +
            templateBody;
        }
        else {
            message =
            "Content-Type: text/html; charset=UTF-8 \r\n" +
            "To: " + toEmail + "\r\n" +
            "Subject: " + formValues.subject + "\r\n\r\n" +
            formValues.body;
        }
        try {
            //make payload
            const payload = {
                token: token,
                body: message,
            };
            const response = await fetch('https://sendemail-niisnxz5da-uc.a.run.app', { //for deployed app

            // const response = await fetch('http://127.0.0.1:5001/mail-maker-1b4d9/us-central1/sendEmail', {   //for debug on local side
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });
    
            if (response.ok) {
                const result = await response;
                console.log('Email sent:', result);
                setButtonText('sent !!');
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
        <p>1. Add your recipients or link a public google email sheet below!</p>
        <Box //for email, subject lines
                component="form"
                sx={{ display: 'flex', flexDirection: 'row', '& > :not(style)': { m: 1, width: '25ch' }, alignItems: 'center',  justifyContent: 'space-between' }}
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
                <FormGroup>
                    <FormControlLabel control={
                        <Checkbox 
                            onChange={handleSheetChange}
                            sx={{color: '#A0AAB4', '& .MuiCheckbox-root': {borderColor: 'white'}}}
                        />} 
                        label="Google Sheet" 
                        sx = {{display: 'flex', justifyContent: 'center',}}
                    />
                </FormGroup>
            </Box>
        {sheet && (
            <Box  //for body
            component="form"
            sx={{ '& > :not(style)': { m: 1, width: '52ch' } }}
            noValidate
            autoComplete="off"
            >
                <TextInput
                    name="range"
                    label="Range (e.g. A1:A2)"
                    id="outlined"
                    value={formValues.range}
                    onChange={handleFormChange}
                />
            </Box>
        )}
        <p>2. Upload a template or fill out the subject and body!</p>

        <ToggleButtonGroup
            value={templateStatus} 
            exclusive
            onChange={handleTemplateChange}
            variant="outlined" 
            sx = {{'& .MuiToggleButton-root': {color: '#A0AAB4', borderColor: 'white'}, '& .MuiToggleButton-root.Mui-selected': {color: '#3f51b5', borderColor: '#3f51b5'}}}
        >
            <ToggleButton value="template">Use template</ToggleButton>
            <ToggleButton value="write">Write yourself</ToggleButton>
        </ToggleButtonGroup>
        {templateStatus == "template" && ( //template selected
            <form onSubmit={handleSubmit}>
            <br />
            <p>Add a link to a template document! (doesn't need to be public)</p>
            <Box
                component="form"
                sx={{ '& > :not(style)': { m: 1, width: '52ch' } }}
                noValidate
                autoComplete="off"
            >
                <TextInput
                    name="templateLink"
                    label="Template Link"
                    id="outlined"
                    value={formValues.link}
                    onChange={handleFormChange}
                />

            </Box>
        </form>
        )}
        {templateStatus == "write" && ( //user chooses to write email
            <form onSubmit={handleSubmit}>
                <br />
                <p>Draft email below!</p>
                <Box
                    component="form"
                    sx={{ '& > :not(style)': { m: 1, width: '52ch' } }}
                    noValidate
                    autoComplete="off"
                >
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
        )}
        <br />
        <p>3. send !!</p>
        <button onClick={sendEmail}>{buttonText}</button>
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