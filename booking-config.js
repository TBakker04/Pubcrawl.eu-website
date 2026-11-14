// Boeken.
// api: adres van de Cloud Functions (Blaze-plan nodig); leeg = geen server.
// request: zonder server gaat een aanvraag met kortingscode als e-mail naar dit adres; Thobias maakt de code in admin.html
//          en stuurt hem met de knop "Stuur per mail". freeCodes: de codes die zo werken (hoofdletters maken niet uit).
// script: adres van de Pubgolf-backend (Google Apps Script web-app, apps-script/): maakt bij een gratis code direct de spelcode
//         en mailt hem; leeg = aanvraag via het mailprogramma van de klant.
// paid: true = betalen via Stripe (vanaf de hard launch, alleen met api).
window.PC_BOOKING = { api: '', script: 'https://script.google.com/macros/s/AKfycbweMnkWwOdYBanmhGra8A90J9nA_mUrLLg6rPN1U_l2gQjfRAaDiZLUUJXc9qjAihr9/exec', request: 'bookings@forkit.nl', freeCodes: ['ERASMUS'], price: 5, paid: false };
