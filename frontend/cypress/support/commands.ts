/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Setzt Auth-Cookie und localStorage so, dass der Router-Guard passiert.
       */
      setupAuth(username?: string): Chainable<void>

      /**
       * Fügt einen Artikel in die Einkaufsliste ein.
       */
      addListItem(name: string, menge?: string): Chainable<void>

      /**
       * Aktiviert den simulierten Offline-Modus über den Debug-Toggle.
       * Setzt voraus, dass die Seite mit ?debug=true geöffnet wurde.
       */
      goOffline(): Chainable<void>

      /**
       * Deaktiviert den simulierten Offline-Modus über den Debug-Toggle.
       */
      goOnline(): Chainable<void>

      /**
       * Simuliert einen echten Netzwerkausfall über das browser offline-Event.
       */
      triggerBrowserOffline(): Chainable<void>

      /**
       * Simuliert Netzwerkwiederherstellung über das browser online-Event.
       */
      triggerBrowserOnline(): Chainable<void>
    }
  }
}

Cypress.Commands.add('setupAuth', (username = 'testuser') => {
  cy.setCookie('checkit_username', encodeURIComponent(username));
});

Cypress.Commands.add('addListItem', (name: string, menge = '1') => {
  // erstes sichtbares Textfeld = Artikel-Input
  cy.get('input').first().clear().type(name);
  if (menge !== '1') {
    // Mengen-Feld ist das dritte Input (nach Artikel und Kategorie-Select-Input)
    cy.get('input').eq(2).clear().type(menge);
  }
  cy.get('.mdi-plus').closest('button').click();
  // Warten bis der Artikel in der Tabelle erscheint
  cy.contains('td', name).should('be.visible');
});

Cypress.Commands.add('goOffline', () => {
  cy.contains('button', 'Online').click();
  cy.get('.v-alert').contains('Du bist offline').should('be.visible');
});

Cypress.Commands.add('goOnline', () => {
  cy.contains('button', 'Offline').click();
  cy.get('.v-alert').contains('Du bist offline').should('not.exist');
});

Cypress.Commands.add('triggerBrowserOffline', () => {
  cy.window().then(win => win.dispatchEvent(new Event('offline')));
});

Cypress.Commands.add('triggerBrowserOnline', () => {
  cy.window().then(win => win.dispatchEvent(new Event('online')));
});

export {};
