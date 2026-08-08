/* Konfiguracja wysyłki formularza awarii (EmailJS).
 *
 * 1. Załóż konto na https://www.emailjs.com/
 * 2. Dodaj usługę e-mail i szablon wiadomości.
 * 3. Uzupełnij poniższe wartości.
 * 4. Szablon powinien przyjmować pola: name, phone, email, address, type, description, noticed.
 *
 * Gdy publicKey jest pusty, formularz otworzy klienta poczty (mailto) jako zapas.
 */
window.SITE_CONFIG = {
  reportEmail: "leogamepl@gmail.com",
  emailjs: {
    publicKey: "",
    serviceId: "",
    templateId: ""
  }
};
