const frame = document.querySelector('iframe');
document.querySelector('#width').addEventListener('change', event => { document.querySelector('.sidebar-frame').className = `sidebar-frame width-${event.target.value}`; });
document.querySelector('#theme').addEventListener('change', event => { frame.src = `/sidebar.html?theme=${event.target.value}`; });
