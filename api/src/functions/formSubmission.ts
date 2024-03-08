import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import recaptcha from 'recaptcha-promise'
import { createTransport } from 'nodemailer'
import sanitizeHtml = require("sanitize-html");

type PromiseOf<T extends Promise<any>> = T extends Promise<infer U> ? U : any
type _FORMDATA = PromiseOf<ReturnType<HttpRequest['formData']>>
type _FORMDATAENTRY = ReturnType<_FORMDATA['get']>
type _FILE = Exclude<_FORMDATAENTRY, string>

function asFile(entry: _FORMDATAENTRY | null): _FILE | null {
    return (!entry || typeof entry === 'string') ? null : entry
}

function sanitize(input: _FORMDATAENTRY): string | null {
    return (typeof input === 'string' || typeof input === 'number') ? sanitizeHtml(input.toString(), { allowedTags: [] }) : null
}

const forms: Record<string, [string, (arg0: _FORMDATA) => string[]]> = {
    'contact': ['Website Contact Us', contactContent],
    'create-account': ['New Courier Account', accountContent],
    'new-process-order': ['New Process Order', processContent]
}

function makeContent(formType: string, formData: _FORMDATA): string {
    return [
        `<h1>${forms[formType][0]}</h1>`,
        `<p><b>Date: </b>${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })}</p>`,
        '<br>',
        ...forms[formType][1](formData)
    ].join('\n')
}

const line = (key: string, valueKey: string, formData: _FORMDATA) => `<p><b>${key}: </b>${sanitize(formData.get(valueKey)) || '<em>Not provided</em>'}</p>`

function contactContent(formData: _FORMDATA): string[] {
    return [
        line('Name', 'name', formData),
        line('Company', 'company', formData),
        line('Phone', 'phone', formData),
        line('Email', 'email', formData),
        line('Comments', 'comments', formData)
    ]
}

function accountContent(formData: _FORMDATA): string[] {
    return [
        '<h2>Company Information</h2>',
        line('Company', 'companyName', formData),
        line('Type of business', 'companyType', formData),
        line('Phone', 'companyPhone', formData),
        line('Extension', 'companyPhoneExtension', formData),
        line('Address line 1', 'companyAddressLine1', formData),
        line('Address line 2', 'companyAddressLine2', formData),
        line('City', 'companyAddressCity', formData),
        line('State', 'companyAddressState', formData),
        line('Zip code', 'companyAddressZipCode', formData),
        '<hr>',
        '<h2>Contact Information</h2>',
        line('Name', 'contactName', formData),
        line('Phone', 'contactPhone', formData),
        line('Extension', 'contactPhoneExtension', formData),
        line('Email', 'contactEmail', formData),
        '<hr>',
        '<h2>Accounts Payable Contact</h2>',
        line('Name', 'accountsContactName', formData),
        line('Phone', 'accountsContactPhone', formData),
        line('Extension', 'accountsContactPhoneExtension', formData),
        line('Email', 'accountsContactEmail', formData),
        line('Billing address same as business address', 'sameBillingAddress', formData),
        '<hr>',
        '<h2>Login</h2>',
        line('Desired password', 'password', formData),
        line('Account email', 'loginEmail', formData),
        '<hr>',
        '<h2>Comments</h2>',
        line('Comments', 'comments', formData)
    ]
}

function processContent(formData: _FORMDATA): string[] {
    let hasFile: boolean = asFile(formData.get('uploadFile')) !== null
    return [
        '<h2>Contact Information</h2>',
        line('Company name', 'companyName', formData),
        line('Your name', 'name', formData),
        line('Email address', 'emailAddress', formData),
        line('Phone number', 'phoneNumber', formData),
        '<h2>Order Information</h2>',
        line('Reference/client matter number', 'referenceNumber', formData),
        line('Case number', 'caseNumber', formData),
        line('Type of service', 'serviceType', formData),
        line('Pickup location', 'pickupLocation', formData),
        line('Who are we serving', 'individualOrBusiness', formData),
        line('Individual/business to be served', 'serveName', formData),
        line('Position (if business)', 'businessPosition', formData),
        line('Individual/business address', 'serveAddress', formData),
        line('Comments', 'comments', formData),
        `<p><b>Upload file: </b>${hasFile ? '<b>Attached to email</b>' : '<em>Not provided</em>'}</p>`
    ]
}

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
    
    // TODO
    // Set up email transport
    const transport = createTransport({
        host: SMTP_SERVER,
        port: parseInt(SMTP_PORT),
        secure: false,
        requireTLS: true,
        auth: {
            user: EMAIL_FROM,
            pass: EMAIL_PASSWORD
        }
    })
    try {
        await transport.verify()
    } catch (e) {
        context.error('Failed to verify mail transport', e)
        return { jsonBody: { message: 'Invalid mail server configuration.' }, status: 500 }
    }

    let formType = formData.get('form')?.toString()
    if (!formType || !forms[formType])
        return { jsonBody: { message: 'Unknown form' }, status: 400 }
    let content = makeContent(formType, formData)
    let file: _FILE | null = null
    if (formType === 'new-process-order') {
        file = asFile(formData.get('uploadFile'))
    }

    let response = await transport.sendMail({
        from: EMAIL_FROM,
        to: 'me@gregwhatley.dev',
        subject: forms[formType][0],
        html: content,
        attachments: file ? [
            {
                filename: file.name,
                contentType: file.type,
                content: Buffer.from(await file.arrayBuffer())
            }
        ] : undefined
    })
    context.info('SMTP response', response)

    return { jsonBody: { message: 'Success' } };
};

app.http('formSubmission', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: formSubmission
});
