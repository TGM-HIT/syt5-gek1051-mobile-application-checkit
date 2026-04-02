/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Setzt Auth-Cookie so, dass der Router-Guard passiert.
       */
      setupAuth(username?: string): Chainable<void>

      /**
       * Fügt einen Artikel in die Einkaufsliste ein.
       */
      addListItem(name: string, menge?: string): Chainable<void>

      /**
       * Aktiviert den simulierten Offline-Modus über den Debug-Toggle.
       * Nutzt Regex, um Groß-/Kleinschreibung (ONLINE) zu ignorieren.
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
  // Erstes sichtbares Textfeld = Artikel-Input
  cy.get('input').first().clear().type(name, { force: true });
  if (menge !== '1') {
    // Mengen-Feld ist das dritte Input (Index 2)
    cy.get('input').eq(2).clear().type(menge, { force: true });
  }
  cy.get('.mdi-plus').closest('button').click();

  // Warten bis der Artikel erscheint (Suche global im Dokument)
  cy.contains(name, { timeout: 10000 }).should('be.visible');
});

Cypress.Commands.add('goOffline', () => {
  // Wir suchen nach einem Button, der das Wort "online" enthält (egal ob ONLINE oder Online)
  // und stellen sicher, dass wir nur den sichtbaren Button klicken.
  cy.contains('button:visible', /online/i, { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

  // Bestätigung über die CSS-Klasse in der ListView.vue
  cy.get('.offline-banner', { timeout: 15000 })
      .should('be.visible')
      .and('contain', 'Du bist offline');
});

Cypress.Commands.add('goOnline', () => {
  // Wir suchen nach einem sichtbaren Button, der "offline" enthält
  cy.contains('button:visible', /offline/i, { timeout: 15000 })
      .should('be.visible')
      .click({ force: true });

  // Banner muss verschwinden
  cy.get('.offline-banner').should('not.exist');
});

Cypress.Commands.add('triggerBrowserOffline', () => {
  cy.window().then(win => win.dispatchEvent(new Event('offline')));
});

Cypress.Commands.add('triggerBrowserOnline', () => {
  cy.window().then(win => win.dispatchEvent(new Event('online')));
});

export {};