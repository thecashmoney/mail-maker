import {setDoc} from 'firebase/firestore';

//----------------------------------------------------------   FUNCTIONS FOR SENDING EMAILS  ----------------------------------------------------------

export async function getSheet(formValues, user) {
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

export async function getTemplate(formValues, addFormField) {
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
        localStorage.setItem("messageArr", messageArr);
    }
    catch {
        console.error("Error reading template:");
        return "";
    }
}

export const sendEmail = async (formValues, sheet, templateStatus, formFields, user) => {
    console.log("Sheet: ", sheet);
    let toEmail;
    if (!sheet) {
        toEmail = formValues.email;
    }
    else {
        toEmail = await getSheet(formValues, user);
    }
    let message;
    if (templateStatus == "template") {
        const messageArr = localStorage.getItem("messageArr");
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
            return true;
        } else {
            const error = await response;
            console.error('Error sending email:', error);
            return false;
        }
    } catch (error) {
        console.error('Error calling Firebase function:', error);
        return false;
    }
};

//----------------------------------------------------------   FUNCTIONS FOR SAVED TEMPLATES  ----------------------------------------------------------

export const saveTemplate = async (formValues, sheet, templateStatus, userRef, loadedTemplates, setLoadedTemplates) => {
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
    const templateIndex = loadedTemplates.findIndex(temp => temp.templateName == formValues.templateName)
    let newLoadedTemplates = loadedTemplates;
    //modify existing template
    if (templateIndex != -1) {
        newLoadedTemplates[templateIndex] = template;
        setLoadedTemplates(newLoadedTemplates);
    }

    //otherwise add current template
    else {
        newLoadedTemplates.push(template)
        setLoadedTemplates(newLoadedTemplates);
    }

    console.log("New templates: ", newLoadedTemplates);
    await pushTemplates(userRef, newLoadedTemplates);
}

export const loadTemplates = async (data, userRef, setLoadedTemplates) => {
    try {
        if (data && data.templates != null) {
            console.log('Received templates:', data.templates);
            setLoadedTemplates(data.templates);
        } else {
            console.log('new user');
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
            await pushTemplates(userRef, templates);
            setLoadedTemplates(templates);
        }
    } catch (error) {
        console.error('error calling firestore:', error);
    };
}
//save to cloud storage
const pushTemplates = async (userRef, loadedTemplates) => {
    try {
        await setDoc(userRef, {
            templates: loadedTemplates,
        });
        console.log('Data stored successfully!');
    } catch (error) {
        console.error('Error storing data:', error);
    };
}

export const openTemplate = (event, selectedTemplateName, setCurrentTemplate, setSheet, setTemplate, formValues, loadedTemplates) => {
    const newTemplate = loadedTemplates.find(template => template.templateName == selectedTemplateName);
    setCurrentTemplate(newTemplate);
    setSheet(newTemplate.sheet)
    setTemplate(newTemplate.templateStatus);
    Object.assign(formValues, newTemplate);
};

export const removeTemplate = (event, selectedTemplateName, setCurrentTemplate, userRef, loadedTemplates, setLoadedTemplates) => {
    const selectedTemplate = loadedTemplates.find(template => template.templateName == selectedTemplateName);
    setCurrentTemplate(null);
    const newLoadedTemplates = loadedTemplates.filter(template => template.templateName != selectedTemplate.templateName)
    setLoadedTemplates(newLoadedTemplates);
    pushTemplates(userRef, newLoadedTemplates);
};