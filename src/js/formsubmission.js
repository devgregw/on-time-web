function onSubmit(token) {
    let form = document.body.querySelector('form')
    let formData = new FormData(form)
    validatePassword()
    let submitButton = document.body.querySelector('button#submit')
    if (form.reportValidity()) {
        submitButton.disabled = true
        submitButton.textContent = "Please wait..."
        fetch('/api/formSubmission', { method: 'POST', body: formData }).then(r => {
            if (r.ok) {
                alert(form.getAttribute('data-submissionmessage') || 'Thank you, your message has been sent.')
                form.reset()
                window.location.reload()
            } else
                alert('Sorry, an error occurred while submitting this form. Please try again.')
        }, e => {
            console.error(e)
            alert('Sorry, an error occurred while submitting this form. Please try again.')
        }).finally(() => {
            submitButton.disabled = false
            submitButton.textContent = "Submit"
        })
    }
}
