const popover = new bootstrap.Popover(document.getElementById('payment-button'), {
    html: true,
    content: document.getElementById('payment-popover'),
    trigger: 'focus'
})
