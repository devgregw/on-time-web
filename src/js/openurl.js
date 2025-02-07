document.querySelectorAll('button[data-openurl]:not([data-openurl=""])')
    .forEach(elem => elem.onclick = () => {
        let url = elem.getAttribute('data-openurl')
        url && window.open(url, '_blank', 'noopener,noreferrer')
        return !url
    })
