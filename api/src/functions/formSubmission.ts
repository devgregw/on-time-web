import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import recaptcha from 'recaptcha-promise'
import { createTransport } from 'nodemailer'

export async function formSubmission(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const formData = await request.formData()

    // Environment variables
    const {
        RECAPTCHA_SECRET,
        EMAIL_FROM,
        EMAIL_PASSWORD,
        EMAIL_TO_MAIN,
        EMAIL_TO_PROCESS,
        SMTP_SERVER,
        SMTP_PORT
    } = process.env
    // Return code 500 if one or more are falsy
    let invalidEnvironment = [RECAPTCHA_SECRET, EMAIL_FROM, EMAIL_PASSWORD, EMAIL_TO_MAIN, EMAIL_TO_PROCESS].some(value => !value)
    if (invalidEnvironment) {
        context.error('Invalid server configuration: one or more required environment variables are unset.')
        return { jsonBody: { message: 'Invalid server configuration.' }, status: 500 }
    }

    // Verify reCAPTCHA token
    const token = formData.get('g-recaptcha-response')?.toString()
    const verifyCaptcha = recaptcha.create({ secret: RECAPTCHA_SECRET })
    const challengePassed = await verifyCaptcha(token)
    if (!challengePassed) {
        context.info('reCAPTCHA verification failed.', token)
        return { jsonBody: { message: 'reCAPTCHA verification failed.' }, status: 400 }
    }

    return { jsonBody: { message: 'Success' } };
};

app.http('formSubmission', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: formSubmission
});
