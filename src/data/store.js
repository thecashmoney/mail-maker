import {create} from 'zustand';

export const useStore = create((set) => ({
    formValues: {
        email: "",
        subject: "",
        body: "",
        range: "",
        templateName: "",
    },
    formFields: [],
    sheet: false,
    templateStatus: "template",
    currentTemplate: null,
    buttonText: "send !!!",
    setTemplateStatus: (templateStatus) => {
        set({
            templateStatus: templateStatus
        })
    },
    setCurrentTemplate: (template) => {
        set({
            currentTemplate: template
        })
    },
    setButtonText: (text) => {
        set({
            buttonText: text
        })
    },
    setSheet: (sheet) => {
        set({
            sheet: sheet
        })
    },
    handleFormChange: (event) => {
        const {name, value} = event.target;
        set(prevValues => ({
            formValues: {...prevValues.formValues, [name]: value}
        }));
    },
    addFormField: (field) => {
        set(prevValues => ({
            formFields: [...prevValues.formFields, {id: (prevValues.formFields.length + 1).toString(), value: '', label: field}]
        }));
    },
    handleFormFieldChange: (id, event) => {
        set(prevValues => {
            const updatedFormField = prevValues.formFields.map((formField) =>
                formField.id === id ? {...formField, value: event.target.value, label: formField.label} : formField
            );

            return {
                formFields: updatedFormField
            }
        })
    },
    handleSheetChange: (event) => {
        set({
            sheet: event.target.checked
        })
    },
    handleTemplateChange: (event, newTemplateStatus) => {
        set ({
            templateStatus: newTemplateStatus
        })
    }
}))