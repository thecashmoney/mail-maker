import { useState, useEffect } from 'react'
import './App.css'
import { googleLogout, useGoogleLogin } from '@react-oauth/google'
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import axios from 'axios';
function App() {
    const [ user, setUser ] = useState(null);
    const [ profile, setProfile ] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);
    
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

    //gapi quickstart
    // TODO(developer): Set to client ID and API key from the Developer Console
    const CLIENT_ID = '348073828150-3tm7tsfgg51bm266t902nomfliad9qmo.apps.googleusercontent.com';
    const API_KEY = user.access_token;

    // Discovery doc URL for APIs used by the quickstart
    const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest';

    // Authorization scopes required by the API; multiple scopes can be
    // included, separated by spaces.
    const SCOPES = 'https://www.googleapis.com/auth/gmail.send ';

    let tokenClient;
    let gapiInited = false;
    let gisInited = false;

    document.getElementById('authorize_button').style.visibility = 'hidden';
    document.getElementById('signout_button').style.visibility = 'hidden';

    /**
     * Callback after api.js is loaded.
     */
    function gapiLoaded() {
        gapi.load('client', initializeGapiClient);
    }

    /**
     * Callback after the API client is loaded. Loads the
     * discovery doc to initialize the API.
     */
    async function initializeGapiClient() {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        maybeEnableButtons();
    }

    /**
     * Callback after Google Identity Services are loaded.
     */
    function gisLoaded() {
        tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
        gisInited = true;
        maybeEnableButtons();
    }


    //check if saved user is present- if so, open tht user.
    useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user'));
    if (savedUser) {
        setUser(savedUser);
    }
    }, []);
    const login = useGoogleLogin({
    onSuccess: (codeResponse) => { setUser(codeResponse);
        // store user in localstorage if remember me box is checked
        if (rememberMe) {
        localStorage.setItem('user', JSON.stringify(codeResponse));
        }
    },
    onError: (error) => console.log('Login Failed:', error),
    });
    useEffect(
        () => {
            if (user) {
                axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
                        headers: {
                            Authorization: `Bearer ${user.access_token}`,
                            Accept: 'application/json'
                        }
                    })
                .then((res) => {setProfile(res.data);})
                .catch((err) => console.log(err));
            }
        },
        [ user ]
    );

    // log out function to log the user out of google and set the profile array to null
    const logOut = () => {
        googleLogout();
        setProfile(null);
        setUser(null);
        localStorage.removeItem('user');
    };
    const handleSubmit = (event) => {
        event.preventDefault();
    };

    const sendEmail = () => {
        const { email, subject, body } = formValues;
        const message =
        "From: " + profile.email + "\r\n" + 
        "To: " + email + "\r\n" +
        "Subject: " + subject + "\r\n\r\n" +
        body;

        console.log('Form Submitted:', formValues);

        // The body needs to be base64url encoded.
        const encodedMessage = btoa(message)

        const reallyEncodedMessage = encodedMessage.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

        gapi.client.gmail.users.messages.send({
            userId: 'me',
            resource: { // Modified
                // same response with any of these
                raw: reallyEncodedMessage
                // raw: encodedMessage
                // raw: message
            }
        }).then(function () { console.log("done!");
        }).catch((error) => {
            console.error('Error sending email:', error);
        });
    }

    const handleRememberMeChange = (e) => {
    setRememberMe(e.target.checked);
    };
    

    return (
        <div>
            {profile ? (
                <div>
                    <nav>
                    <div class="navitems">
                        <div class="left">
                            <a href="/" class="home-link">logo</a>
                        </div>
                        <div class="right">
                            <p class="rightitem">hi {profile.name.split(' ')[0].toLowerCase()} !!!! ({profile.email})</p>
                            <img src={profile.picture} alt="user image" class="profile-pic" />
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
                            <TextField
                            name = "email"
                            label="email"
                            id="outlined"
                            value={formValues.email}
                            onChange={handleFormChange}
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
                                },
                            }}
                            />
                            <TextField
                            name = "subject"
                            label="subject"
                            id="outlined"
                            value={formValues.subject}
                            onChange={handleFormChange}
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
                                },
                            }}
                            />
                        </Box>
                        <Box  //for body
                        component="form"
                        sx={{ '& > :not(style)': { m: 1, width: '52ch' } }}
                        noValidate
                        autoComplete="off"
                        >
                            <TextField
                            name = "body"
                            id="outlined-multiline-static"
                            label="body"
                            multiline
                            rows={4}
                            //value={formValues.body}
                            onChange={handleFormChange}
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
                        </Box>
                    </form>
                    <button onClick={sendEmail}>send !!!</button>
                    <br /><br />
                    <button onClick={logOut}>Log out</button>
                </div>
            ) : (
                <div>
                <h2>mail maker !!!!</h2>
                <br />
                <h3>give a template, and we'll mass send emails!</h3>
                <br />
                <button onClick={login}>sign in !!! (requires google account access) 🚀</button>

                {/* remember me button */}
                <br /><br /><br />
                <div>
                    <label>
                    <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={handleRememberMeChange}
                    />
                    Remember me !!!!
                    </label>
                </div>
                <br /><br /><br />
                <h3>NOTE</h3>
                <p>Google will warn you that this is an unverified app. This is because our app will gain permission to send emails through your account. We will <b>only</b> use this power to send out group emails through your account and <b>nothing else.</b> Please continue with the app to be able to use it. It is hard for me to get verified because of the hard requirements (I need to make a privacy policy !!!! 😭)</p>
                </div>
            )}
        </div>
    );
}

export default App;
