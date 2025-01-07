"use strict";
import {useState, useEffect} from 'react'
import './index.css'
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import {Checkbox, FormControlLabel, FormGroup, inputClasses} from '@mui/material';
import {useAuth, useSigninCheck, FirebaseAppProvider, FirestoreProvider, useFirestoreDocData, useFirestore, useFirebaseApp, AuthProvider, useStorage} from 'reactfire';
import {getAuth} from 'firebase/auth';
import {GoogleAuthProvider, signInWithPopup} from "firebase/auth";
import {doc, getFirestore, updateDoc, setDoc, connectFirestoreEmulator} from 'firebase/firestore';
import AddIcon from '@mui/icons-material/Add';

const signOut = auth => auth.signOut().then(() => console.log('signed out')).then(localStorage.removeItem("savedTemplates"));
const signIn = async auth => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    provider.addScope('https://www.googleapis.com/auth/documents.readonly');
    signInWithPopup(auth, provider).then((result) => {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        localStorage.setItem("token", credential.accessToken);
    });
}

function Auth() {
    const {status, data: signinResult} = useSigninCheck();
    const db = useFirestore();

    if (status === 'loading') {
        return <p>loading !!!</p>;
    }

    const {signedIn, user} = signinResult;
    if (signedIn) {
        return (<SignedInHTML user={user} db={db} />);
    } else return (<SignedOutHTML />);
}

function App() {
    const firebaseApp = useFirebaseApp();
    const auth = getAuth(firebaseApp);
    const firestoreInstance = getFirestore(firebaseApp);
    return (
        <AuthProvider sdk={auth}>
            <FirestoreProvider sdk={firestoreInstance}>
                <Auth />
            </FirestoreProvider>
        </AuthProvider>
    )
}

function SignedInHTML({user, db}) {
    //----------------------------------------------------------   FORM FUNCTIONS, VALUES  ----------------------------------------------------------
    const auth = useAuth();

    const [formValues, setFormValues] = useState({
        email: '',
        subject: '',
        body: '',
        range: '',
        templateLink: '',
        templateName: '',
    });
    const [formFields, setFormFields] = useState([]);
    const [sheet, setSheet] = useState(false);
    const [templateStatus, setTemplate] = useState('template');
    const [currentTemplate, setCurrentTemplate] = useState(null);

    const handleFormChange = (event) => {
        const {name, value} = event.target;
        setFormValues(prevValues => ({
            ...prevValues,
            [name]: value
        }));
    };

    const addFormField = (label) => {
        setFormFields(prevFormFields => ([...prevFormFields, {id: (prevFormFields.length + 1).toString(), value: '', label: label}]));
    }
    const handleFormFieldChange = (id, event) => {
        const updatedFormField = formFields.map((formField) =>
            formField.id === id ? {...formField, value: event.target.value, label: formField.label} : formField
        );
        setFormFields(updatedFormField);
    }

    const handleSheetChange = (event) => {
        setSheet(event.target.checked);
    };

    const handleTemplateChange = (event, newTemplateStatus) => {
        setTemplate(newTemplateStatus);
    }

    const handleSubmit = (event) => {
        event.preventDefault();
    };

    const [buttonText, setButtonText] = useState('send !!!');

    //----------------------------------------------------------   FUNCTIONS FOR SENDING EMAILS  ----------------------------------------------------------
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
            const keyRaw = await fetch('https://us-central1-mail-maker-1b4d9.cloudfunctions.net/getSheetsKey', { //deployed
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
            const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + match[1] + '/values/' + formValues.range + '?key=' + key, {
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
            //look for template id
            const regex = /https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/;
            const match = formValues.templateLink.match(regex);
            console.log("Template ID: ", match[1]);
            //receive template data
            const token = localStorage.getItem("token")
            const response = await fetch('https://docs.googleapis.com/v1/documents/' + match[1], {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Accept': 'application/json',
                }
            });
            const data = await response.json();
            let message = "";
            let messageArr = [];
            console.log("Loaded", data.title);
            //parse data
            data.body.content.forEach(function (element) {
                if (element.paragraph) {
                    element.paragraph.elements.forEach(function (paragraphElement) {
                        if (paragraphElement.textRun) {
                            const textContent = paragraphElement.textRun.content;
                            const textStyle = paragraphElement.textRun.textStyle;

                            let fragment = textContent;

                            const textFieldMatches = [...fragment.matchAll(/\\(.*?)\\/g)]; //look for backslashes
                            //if there are backslash matches
                            if (textFieldMatches.length != 0) {

                                //slice up text into pieces with matches or plaintext, add matches
                                let currentString = fragment;
                                let currentIndex = 0;
                                let fragmentParts = [];

                                textFieldMatches.forEach(match => {
                                    const beforeMatch = currentString.slice(currentIndex, match.index);
                                    if (beforeMatch) fragmentParts.push({type: 'text', value: beforeMatch});
                                    fragmentParts.push({type: 'match', value: match[1]});
                                    currentIndex = match.index + match[0].length;
                                    addFormField(match[1]);
                                })

                                //account for formatting
                                if (textStyle.bold) message += '<b>';
                                if (textStyle.italic) message += '<i>';
                                if (textStyle.underline) message += '<u>';

                                //look for textValues in between
                                let textValues;
                                if (fragmentParts.some(part => part.type === 'text')) {
                                    //add first part of textValues to previous message and add it in
                                    textValues = (fragmentParts.filter(part => part.type === 'text')).map(part => part.value)
                                    message += textValues.shift();
                                }

                                //add to messageArr
                                messageArr.push(message);

                                //reset message
                                message = "";

                                //add formatting closing brackets
                                if (textStyle.underline) message += '</u>';
                                if (textStyle.italic) message += '</i>';
                                if (textStyle.bold) message += '</b>';

                                //load up next message (if existing) and add them
                                if (textValues != undefined) {
                                    textValues.forEach((value) => {
                                        message += value;
                                        messageArr.push(message);
                                        message = "";
                                    });
                                }
                            }
                            else {
                                if (textStyle.bold) fragment = '<b>' + fragment + '</b>';
                                if (textStyle.italic) fragment = '<i>' + fragment + '</i>';
                                if (textStyle.underline) fragment = '<u>' + fragment + '</u>';
                                if (textStyle.link) {
                                    const url = textStyle.link.url;
                                    fragment = '<a href="' + url + '" target="_blank">' + fragment + '</a>';
                                }
                                message += fragment;
                            }
                        }
                    });
                    message += "<br>";
                }
            });
            messageArr.push(message);
            localStorage.setItem("messageArr", JSON.stringify(messageArr));
        }
        catch {
            console.error("Error reading template:");
            return "";
        }
    }

    const sendEmail = async () => {
        const {email, subject, body} = formValues;
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
            const messageArr = JSON.parse(localStorage.getItem("messageArr"));
            console.log(messageArr);

            //create basic message
            message =
                "Content-Type: text/html; charset=UTF-8 \r\n" +
                "To: " + toEmail + "\r\n" +
                "Subject: " + formValues.subject + "\r\n\r\n";

            //add custom data
            for (let i = 0; i < messageArr.length - 1; i++) {
                message += messageArr[i];
                message += formFields[i].value;
            }

            //add last message part
            message += messageArr[messageArr.length - 1];

            console.log(message);
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
            const token = localStorage.getItem("token");
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


    //----------------------------------------------------------   FUNCTIONS FOR SAVED TEMPLATES  ----------------------------------------------------------
    const userRef = doc(db, 'users', user.uid);
    const {data} = useFirestoreDocData(userRef);
    if (!data) {
        console.log("Creating new document...");
        setDoc(userRef, {});
    }

    const saveTemplate = async () => {
        //save to local storage
        let savedTemplates = JSON.parse(localStorage.getItem("savedTemplates"));

        const template = {
            email: formValues.email,
            sheet: sheet,
            range: formValues.range,
            subject: formValues.subject,
            templateStatus: templateStatus,
            templateLink: formValues.templateLink,
            templateName: formValues.templateName,
        };

        //search if template already exists
        const templateIndex = savedTemplates.findIndex(temp => temp.templateName == formValues.templateName)

        //modify existing template
        if (templateIndex != -1) savedTemplates[templateIndex] = template;

        //otherwise add current template
        else savedTemplates.push(template);

        localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
        console.log("New templates: ", localStorage.getItem("savedTemplates"))
        await pushTemplates();
    }

    const loadTemplates = async () => {
        try {
            if (data.templates != null) {
                console.log('Received templates:', data.templates);
                localStorage.setItem("savedTemplates", data.templates);
            } else {
                console.log('new user');
                localStorage.removeItem("savedTemplates");
                const blankTemplate = {
                    email: "",
                    sheet: false,
                    range: "",
                    subject: "",
                    templateStatus: "template",
                    templateLink: "",
                    templateName: "Template name",
                };
                let templates = [];
                templates.push(blankTemplate);
                localStorage.setItem("savedTemplates", JSON.stringify(templates));
                await pushTemplates();
                console.log(templates);
            }
        } catch (error) {
            console.error('error calling firestore:', error);
        };
    }
    //save to cloud storage
    const pushTemplates = async () => {
        try {
            await updateDoc(userRef, {
                templates: localStorage.getItem("savedTemplates"),
            });
            console.log('JSON data stored successfully!');
            //localStorage.removeItem("savedTemplates");
        } catch (error) {
            console.error('Error storing data:', error);
        };
    }

    const openTemplate = (event, selectedTemplateName) => {
        const newTemplate = JSON.parse(localStorage.getItem("savedTemplates")).find(template => template.templateName == selectedTemplateName);
        setCurrentTemplate(newTemplate);
        setSheet(newTemplate.sheet)
        setTemplate(newTemplate.templateStatus);
        Object.assign(formValues, newTemplate);
    };

    const removeTemplate = (event, selectedTemplateName) => {
        const selectedTemplate = JSON.parse(localStorage.getItem("savedTemplates")).find(template => template.templateName == selectedTemplateName);
        setCurrentTemplate(null);
        let savedTemplates = JSON.parse(localStorage.getItem("savedTemplates"));
        savedTemplates = savedTemplates.filter(template => template.templateName != selectedTemplate.templateName);
        localStorage.setItem("savedTemplates", JSON.stringify(savedTemplates));
        pushTemplates();
    };
    //load templates as soon as signin
    useEffect(() => {
        if (!user || !localStorage.savedTemplates) loadTemplates();
    }, [signIn, user])

    //----------------------------------------------------------   SIGNED IN HTML/CSS  ----------------------------------------------------------
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
        <h1>draft your email here !!</h1>
        <br />
        <p>Your saved templates:</p>
        <div>
            {localStorage.getItem("savedTemplates") &&
                <ButtonGroup 
                    variant="outlined" 
                    aria-label="Templates"
                    sx = {{}}
                >
                    {JSON.parse(localStorage.getItem("savedTemplates")).filter(template => template.templateName != "Template name").map((template, index) => (
                        <Button
                            key={index}
                            onClick={(event) => openTemplate(event, template.templateName)}
                        >
                            {template.templateName}
                        </Button>
                    ))}
                    <Button aria-label="add" onClick={(event) => openTemplate(event, "Template name")}>
                        <AddIcon />
                    </Button>
                </ButtonGroup>
            }
        </div>
        <br /><br />
        {currentTemplate &&
            <div class="emailBox">
                <p>1. Add your recipients or link a public google email sheet below!</p>
                <Box //for email line
                    component="form"
                    sx={{display: 'flex', flexDirection: 'row', '& > :not(style)': {m: 1, width: '25ch'}, alignItems: 'center', justifyContent: 'space-between'}}
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
                                sx={{color: '#A0AAB4', '& .MuiCheckbox-root': {borderColor: '#cad2c5'}, '&.Mui-checked': {color: '#cad2c5'}}}
                            />}
                            label="Google Sheet"
                            sx={{display: 'flex', justifyContent: 'center', }}
                        />
                    </FormGroup>
                </Box>
                {sheet && (
                    <Box  //for body
                        component="form"
                        sx={{'& > :not(style)': {m: 1, width: '52ch'}}}
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
                <Box //for subject line
                    component="form"
                    sx={{'& > :not(style)': {m: 1, width: '52ch'}}}
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
                <p>2. Upload a template or fill out the body!</p>

                <ToggleButtonGroup
                    value={templateStatus}
                    exclusive
                    onChange={handleTemplateChange}
                    variant="outlined"
                    sx={{'& .MuiToggleButton-root': {color: '#A0AAB4', borderColor: '#cad2c5'}, '& .MuiToggleButton-root.Mui-selected': {color: 'white', borderColor: 'white'}}}
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
                            sx={{'& > :not(style)': {m: 1, width: '25ch'}}}
                            noValidate
                            autoComplete="off"
                        >
                            <TextInput
                                name="templateLink"
                                label="Template Link"
                                id="outlined"
                                value={formValues.templateLink}
                                onChange={handleFormChange}
                            />
                            <button type="button" onClick={async () => {await getTemplate();}} style={{width: '10ch', marginLeft: "3ch", marginTop: "1.5ch"}}>Load!</button>
                        </Box>
                        {formFields.length != 0 && (
                            <Box
                                component="form"
                                sx={{display: 'flex', flexDirection: 'row', '& > :not(style)': {m: 1, width: '25ch'}, alignItems: 'center', justifyContent: 'space-between'}}
                                noValidate
                                autoComplete="off"
                            >
                                <p>Input fields detected!</p>
                                <Box
                                    component="form"
                                    sx={{'& > :not(style)': {display: 'flex', flexDirection: 'column', m: 2, width: '25ch'}}}
                                    noValidate
                                    autoComplete="off"
                                >
                                    {formFields.map((formField) => (
                                        <TextInput
                                            key={formField.id}
                                            name={formField.id}
                                            label={formField.label}
                                            id="outlined"
                                            value={formField.value}
                                            onChange={(event) => handleFormFieldChange(formField.id, event)}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </form>
                )}
                {templateStatus == "write" && ( //user chooses to write email
                    <form onSubmit={handleSubmit}>
                        <br />
                        <p>Draft email below!</p>
                        <Box  //for body
                            component="form"
                            sx={{'& > :not(style)': {m: 1, width: '52ch'}}}
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
                <p>Save template?</p>
                <Box
                    component="form"
                    sx={{'& > :not(style)': {m: 1, width: '25ch'}}}
                    noValidate
                    autoComplete="off"
                >
                    <TextInput
                        name="templateName"
                        label="Template Name"
                        id="outlined"
                        value={formValues.templateName}
                        onChange={handleFormChange}
                    />
                    <button type="button" onClick={saveTemplate} style={{width: '10ch', marginLeft: "3ch", marginTop: "1.5ch"}}>Save!</button>
                </Box>
                <br /><br />
                <button onClick={(event) => removeTemplate(event, currentTemplate.templateName)} class="signOutButton">Remove template</button>
            </div>
        }
        <br /><br />
        <button onClick={() => signOut(auth)} class="signOutButton">sign out !!</button>
    </div>
}


//----------------------------------------------------------   SIGNED OUT HTML/CSS  ----------------------------------------------------------
function SignedOutHTML() {
    const auth = useAuth();
    return <div>
        <h2>mail maker !!!!</h2>
        <br />
        <h3>give a template, and we'll mass send emails!</h3>
        <br />
        <button onClick={() => signIn(auth)} class="signInButton">sign in !!! (requires google account access) 🚀</button>

        <br /><br /><br />
        <h3>NOTE</h3>
        <p>Google will warn you that this is an unverified app. This is because our app will gain permission to send emails through your account. We will <b>only</b> use this power to send out group emails through your account and <b>nothing else.</b> Please continue with the app to be able to use it. It is hard for me to get verified because of the hard requirements (I need to make a privacy policy !!!! 😭)</p>
    </div>
}

export default App;

//----------------------------------------------------------   CUSTOM TEXT INPUT  ----------------------------------------------------------
function TextInput({name, label, id, value, onChange, multiline = false, rows = 4}) {
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
                    color: '#cad2c5',
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
                        color: '#cad2c5', // Change text color inside the textarea
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