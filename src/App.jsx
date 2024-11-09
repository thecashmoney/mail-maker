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
                            <p class="rightitem">{profile.email}</p>
                            <img src={profile.picture} alt="user image" class="profile-pic" />
                        </div>
                    </div>
                    </nav>
                    <h2>hi {profile.name.split(' ')[0].toLowerCase()} !!!!</h2>
                    <br />
                    <br />
                    <Box
                    component="form"
                    sx={{ '& > :not(style)': { m: 1, width: '25ch' } }}
                    noValidate
                    autoComplete="off"
                    >
                        <TextField
                        label="email"
                        id="outlined"
                        defaultValue="email"
                        />
                        <TextField
                        label="subject"
                        id="outlined"
                        defaultValue="subject"
                        />
                        <TextField
                        id="outlined-multiline-static"
                        label="body"
                        multiline
                        rows={4}
                        defaultValue="Default Value"
                        />
                    </Box>
                    {/* <button onClick={email}>send !!!</button> */}
                    <br /><br />
                    <button onClick={logOut}>Log out</button>
                </div>
            ) : (
                <div>
                <h2>email maker !!!!</h2>
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
                </div>
            )}
        </div>
    );
}

export default App;
