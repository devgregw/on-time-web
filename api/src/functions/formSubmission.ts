import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { env } from "process";

export async function formSubmission(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);
    const name = env['name'] || request.query.get('name') || await request.text() || 'world';

    return { body: `Hello, ${name}!` };
};

app.http('formSubmission', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: formSubmission
});
