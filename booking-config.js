// Boeken.
// api: adres van de Cloud Functions (Blaze-plan nodig); leeg = geen server.
// request: zonder server gaat een aanvraag met kortingscode als e-mail naar dit adres; Thobias maakt de code in admin.html
//          en stuurt hem met de knop "Stuur per mail". freeCodes: de codes die zo werken (hoofdletters maken niet uit).
// paid: true = betalen via Stripe (vanaf de hard launch, alleen met api).
window.PC_BOOKING = { api: '', request: 'bookings@forkit.nl', freeCodes: ['ERASMUS'], price: 5, paid: false };
