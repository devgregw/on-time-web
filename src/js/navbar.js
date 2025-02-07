let path = window.location.pathname.split('index.html')[0]
if (path !== '/' && path.endsWith('/'))
    path = path.substring(0, path.length - 1)
document.querySelector('a.nav-link[href="' + path + '"]')?.classList.add('active')