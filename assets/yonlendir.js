// QR → albom
try { localStorage.setItem('hs-qr', String(Date.now())); } catch (e) {}
setTimeout(function () { location.replace('../#albom'); }, 700);
