"use strict";
import React, {useEffect} from 'react'
import './index.css'
import './theme-toggle.js'
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import {Checkbox, FormControlLabel, FormGroup} from '@mui/material';
import {useAuth, useSigninCheck, FirestoreProvider, useFirestoreDocData, useFirestore, useFirebaseApp, AuthProvider} from 'reactfire';
import {getAuth} from 'firebase/auth';
import {GoogleAuthProvider, signInWithPopup} from "firebase/auth";
import {doc, getFirestore} from 'firebase/firestore';
import AddIcon from '@mui/icons-material/Add';
import {sendEmail, getTemplate, openTemplate, removeTemplate, saveTemplate, loadTemplates} from "./data/data.js";
import {useStore} from "./data/store.js";

const signOut = auth => auth.signOut().then(() => console.log('signed out')).then(localStorage.removeItem("savedTemplates"));
const signIn = async auth => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    provider.addScope('https://www.googleapis.com/auth/documents.readonly');
    signInWithPopup(auth, provider).then((result) => {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        localStorage.setItem("token", credential.accessToken);
        location.reload();
    });
}

function Auth() {
    const {status, data: signinResult} = useSigninCheck();

    if (status === 'loading') {
        return <p>loading !!!</p>;
    }

    const {signedIn, user} = signinResult;
    if (signedIn) {
        return (<SignedInHTML user={user} />);
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

function SignedInHTML({user}) {
    //----------------------------------------------------------   FORM FUNCTIONS, VALUES  ----------------------------------------------------------
    const auth = useAuth();

    const { formValues, formFields, sheet, templateStatus, currentTemplate, buttonText, handleFormChange, addFormField, handleFormFieldChange, handleSheetChange, handleTemplateChange, setTemplateStatus, setCurrentTemplate, setButtonText, setSheet, loadedTemplates, setLoadedTemplates, resetStore} = useStore();


    const handleSubmit = (event) => {
        event.preventDefault();
    };


    //----------------------------------------------------------   FUNCTIONS FOR SAVED TEMPLATES  ----------------------------------------------------------
    const db = useFirestore();
    const userRef = doc(db, 'users', user.uid);
    const {data, status} = useFirestoreDocData(userRef);


    //load templates as soon as signin
    useEffect(() => {
        if (status == 'success' && user && loadedTemplates.length == 0) {
            console.log("loading");
            loadTemplates(data, userRef, setLoadedTemplates);
        }
    }, [signIn, user, status])

    //----------------------------------------------------------   SIGNED IN HTML/CSS  ----------------------------------------------------------
    return <div>
        <nav>
            <div className="navitems">
                <div className="left">
                    <a href="/" className="home-link"><img src="logo.png" height="50"/></a>
                </div>
                <div className="right">
                    <p className="rightitem">hi {user.displayName.split(' ')[0].toLowerCase()} !!!! ({user.email})</p>
                    <img src={user.photoURL} alt="user image" className="profile-pic" />
                </div>
            </div>
        </nav>
        <br /><br />
        <h1 className="draftText">draft your email here !!</h1>
        <br />
        <p>Your saved templates:</p>
        <br />
        <div>
            <ButtonGroup
                variant="outlined"
                aria-label="Templates"
            >
                {loadedTemplates.filter(template => template.templateName != "Template name").map((template, index) => (
                    <Button
                        key={index}
                        onClick={(event) => openTemplate(event, template.templateName, setCurrentTemplate, setSheet, setTemplateStatus, formValues, loadedTemplates, resetStore)}
                    >
                        {template.templateName}
                    </Button>
                ))}
                <Button aria-label="add" onClick={(event) => openTemplate(event, "Template name", setCurrentTemplate, setSheet, setTemplateStatus, formValues, loadedTemplates, resetStore)}>
                    <AddIcon />
                </Button>
            </ButtonGroup>
        </div>
        <br /><br />
        {currentTemplate &&
            <div className="emailBox">
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
                            <Checkbox onChange={handleSheetChange} />}
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
                <br />
                <ToggleButtonGroup
                    value={templateStatus}
                    exclusive
                    onChange={handleTemplateChange}
                    variant="outlined"
                >
                    <ToggleButton value="template">use template</ToggleButton>
                    <ToggleButton value="write">write yourself</ToggleButton>
                </ToggleButtonGroup>
                {templateStatus == "template" && ( //template selected
                    <form onSubmit={handleSubmit}>
                        <br />
                        <p>Add a link to a template document! (doesn&quot;t need to be public)</p>
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
                            <button type="button" onClick={async () => {await getTemplate(formValues, addFormField, setLoadedTemplates);}} style={{width: '10ch', marginLeft: "3ch", marginTop: "1.5ch"}}>Load!</button>
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
                                value={formValues.body}
                                multiline
                                rows={4}
                                onChange={handleFormChange}
                            />
                        </Box>
                    </form>
                )}
                <br /><br />
                <p>3. send !!</p>
                <button onClick={() => setButtonText(sendEmail(formValues, sheet, templateStatus, formFields, user) ? "sent !!!" : "error sending")}>{buttonText}</button>
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
                    <button type="button" onClick={() => saveTemplate(formValues, sheet, templateStatus, userRef, loadedTemplates, setLoadedTemplates)} style={{width: '10ch', marginLeft: "3ch", marginTop: "1.5ch"}}>Save!</button>
                </Box>
                <br /><br />
                <button onClick={(event) => removeTemplate(event, currentTemplate.templateName, setCurrentTemplate, userRef, loadedTemplates, setLoadedTemplates)} className="removeTemplate">Remove template</button>
            </div>
        }
        <br /><br />
        <button onClick={() => signOut(auth)} className="signOutButton">sign out !!</button>
    </div>
}


//----------------------------------------------------------   SIGNED OUT HTML/CSS  ----------------------------------------------------------
function SignedOutHTML() {
    const auth = useAuth();
    return <div>
        <img src="logo.png" />
        <br /><br />
        <h3>give a template, and we&quot;ll mass send emails!</h3>
        <br />
        <button onClick={() => signIn(auth)} className="signInButton">sign in !!! (requires google account access) 🚀</button>

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
        />
    );
}