/// <reference types="cypress" />

describe('Offline-Erkennung und Sync-Fehlermeldungen', () => {
  let listPath = '';

  before(() => {
    cy.setupAuth();
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('checkit_accounts', JSON.stringify({ testuser: 'testhash' }));
      },
    });

    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Offline-Testliste', { force: true });
    cy.contains("Erstellen & Teilen").click();

    cy.url().should('include', '/list/').then(url => {
      listPath = new URL(url).pathname; 
    });
  });

  beforeEach(() => {
    cy.setupAuth();
    // Wichtig: Wir warten bis die Seite geladen ist
    cy.visit(listPath + '?debug=true');
    cy.contains('button', 'Online', { timeout: 10000 }).should('be.visible');
  });

  describe('Simulierter Offline-Modus (Debug-Toggle)', () => {
    it('zeigt den Offline-Banner wenn der Debug-Toggle auf Offline geschaltet wird', () => {
      cy.goOffline();
      // FIX: Wir suchen global nach dem Text, statt cy.get('.v-alert') zu nutzen
      cy.contains('Du bist offline').should('be.visible');
    });

    it('zeigt einen orangen Snackbar beim Aktivieren des Offline-Modus', () => {
      cy.goOffline();
      // Wir prüfen auf die Snackbar-Klasse direkt
      cy.get('.v-snackbar').should('exist').and('contain', 'Kein Internet');
    });

    it('zeigt einen grünen Snackbar beim Deaktivieren des Offline-Modus', () => {
      cy.goOffline();
      // Snackbar schließen
      cy.contains('Schließen').click({ force: true });
      cy.goOnline();
      cy.get('.v-snackbar').should('exist').and('contain', 'Wieder online');
    });
  });

  describe('Ausstehende Sync-Markierungen bei Offline-Änderungen', () => {
    it('markiert einen offline hinzugefügten Artikel mit dem Cloud-Upload-Icon', () => {
      cy.goOffline();
      // Artikel hinzufügen
      cy.get('input').first().type('Milch offline{enter}', { force: true });
      // Das Icon suchen
      cy.get('.mdi-cloud-upload-outline').should('be.visible');
    });

    it('zeigt im Banner "1 Änderung" nach einem offline hinzugefügten Artikel', () => {
      cy.goOffline();
      cy.get('input').first().type('Einzelartikel offline{enter}', { force: true });
      // FIX: Gezielte Suche nach dem Text im Alert
      cy.contains('.v-alert', '1 Änderung').should('be.visible');
    });

    it('entfernt alle Cloud-Upload-Icons nach Rückkehr ins Netz', () => {
      cy.goOffline();
      cy.get('input').first().type('Sync-Artikel{enter}', { force: true });
      cy.get('.mdi-cloud-upload-outline').should('be.visible');
      
      cy.goOnline();
      cy.get('.mdi-cloud-upload-outline', { timeout: 10000 }).should('not.exist');
    });
  });
});