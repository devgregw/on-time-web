var password = document.body.querySelector('input[name=password]')
var passwordVerify = document.querySelector('input[name=passwordVerify]')

function validatePassword() {
    if (!password.value)
        return
    else if (password.value !== passwordVerify.value || passwordVerify.value.toString().length < 5)
        passwordVerify.setCustomValidity('Passwords must match.')
    else
        passwordVerify.setCustomValidity('')
}

passwordVerify.onchange = validatePassword
passwordVerify.onkeyup = validatePassword
passwordVerify.oninput = validatePassword
passwordVerify.onpaste = validatePassword
