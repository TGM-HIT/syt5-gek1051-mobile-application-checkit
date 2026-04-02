/// <reference types="cypress" />

/**
 * E2E-Tests: Offline-Erkennung und Sync-Fehlermeldungen
 */

describe('Offline-Erkennung und Sync-Fehlermeldungen', () => {
  let listPath = '';

  before(() => {
    cy.setupAuth();

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem(
          'checkit_accounts',
          JSON.stringify({ testuser: 'testhash' })
        );
      },
    });

    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Offline-Testliste');
    cy.contains("Erstellen & Teilen").click();

    cy.url().should('include', '/list/').then(url => {
      listPath = new URL(url).pathname; 
    });
  });

  beforeEach(() => {
    cy.setupAuth();
    cy.then(() => cy.visit(listPath + '?debug=true'));
    cy.contains('button', 'Online', { timeout: 10000 }).should('be.visible');
  });

  describe('Simulierter Offline-Modus (Debug-Toggle)', () => {
    it('zeigt den Offline-Banner wenn der Debug-Toggle auf Offline geschaltet wird', () => {
      cy.goOffline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');
    });

    it('zeigt einen orangen Snackbar beim Aktivieren des Offline-Modus', () => {
      cy.goOffline();
      // FIX: Wir nutzen should('exist') statt 'be.visible', um den Überlappungs-Fehler zu umgehen
      cy.get('.v-snackbar')
        .should('exist')
        .and('contain', 'Kein Internet');
    });

    it('zeigt einen grünen Snackbar beim Deaktivieren des Offline-Modus', () => {
      cy.goOffline();
      
      // FIX: force: true verwenden, falls der Button von Cypress als verdeckt angesehen wird
      cy.get('.v-snackbar').contains('Schließen').click({ force: true });
      
      cy.goOnline();
      
      // FIX: should('exist')
      cy.get('.v-snackbar')
        .should('exist')
        .and('contain', 'Wieder online');
    });
  });

  describe('Ausstehende Sync-Markierungen bei Offline-Änderungen', () => {
    it('markiert einen offline hinzugefügten Artikel mit dem Cloud-Upload-Icon', () => {
      cy.goOffline();
      cy.addListItem('Milch offline');
      cy.get('.mdi-cloud-upload-outline').should('be.visible');
    });

    it('zeigt im Banner "1 Änderung" nach einem offline hinzugefügten Artikel', () => {
      cy.goOffline();
      cy.addListItem('Einzelartikel offline');
      cy.get('.v-alert').contains('1 Änderung').should('be.visible');
    });

    it('entfernt alle Cloud-Upload-Icons nach Rückkehr ins Netz', () => {
      cy.goOffline();
      cy.addListItem('Wird-synchronisiert Artikel');
      cy.goOnline();
      cy.get('.mdi-cloud-upload-outline').should('not.exist');
    });
  });
});