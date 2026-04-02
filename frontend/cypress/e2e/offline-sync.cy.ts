/// <reference types="cypress" />

describe('Offline-Erkennung und Sync-Fehlermeldungen', () => {
  let listPath = '';

  Cypress.on('uncaught:exception', (err) => {
    if (
      err.message.includes("Failed to execute 'transaction' on 'IDBDatabase'") ||
      err.message.includes("reading 'length'")
    ) {
      return false;
    }
    return true;
  });

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

    cy.url().should('match', /\/list\/[a-f0-9]+/).then(url => {
      listPath = new URL(url).pathname; 
    });
  });

  beforeEach(() => {
    cy.setupAuth();
    cy.viewport(1280, 720); 
    
    // Seite mit Debug-Parameter laden
    cy.visit(listPath + '?debug=true');

    // Warten, bis der Button da ist. /online/i findet sowohl "Online" als auch "ONLINE"
    cy.contains('button', /online/i, { timeout: 15000 }).should('be.visible');
  });

  describe('Simulierter Offline-Modus (Debug-Toggle)', () => {
    it('zeigt den Offline-Banner wenn der Debug-Toggle auf Offline geschaltet wird', () => {
      cy.goOffline();
      cy.get('.offline-banner').should('be.visible').and('contain', 'Du bist offline');
    });

    it('zeigt einen orangen Snackbar beim Aktivieren des Offline-Modus', () => {
      cy.goOffline();
      cy.get('.v-snackbar').should('exist').and('contain', 'Kein Internet');
    });

    it('zeigt einen grünen Snackbar beim Deaktivieren des Offline-Modus', () => {
      cy.goOffline();
      cy.contains('Schließen').click({ force: true });
      cy.goOnline();
      cy.get('.v-snackbar').should('exist').and('contain', 'Wieder online');
    });
  });

  describe('Ausstehende Sync-Markierungen bei Offline-Änderungen', () => {
    it('markiert einen offline hinzugefügten Artikel mit dem Cloud-Upload-Icon', () => {
      cy.goOffline();
      cy.get('input').first().type('Milch offline{enter}', { force: true });
      cy.get('.mdi-cloud-upload-outline').should('be.visible');
    });

    it('zeigt im Banner "1 Änderung" nach einem offline hinzugefügten Artikel', () => {
      cy.goOffline();
      cy.get('input').first().type('Einzelartikel offline{enter}', { force: true });
      cy.get('.offline-banner').should('contain', '1 Änderung');
    });

    it('entfernt alle Cloud-Upload-Icons nach Rückkehr ins Netz', () => {
      cy.goOffline();
      cy.get('input').first().type('Sync-Test{enter}', { force: true });
      cy.get('.mdi-cloud-upload-outline').should('be.visible');
      
      cy.goOnline();
      cy.get('.mdi-cloud-upload-outline', { timeout: 15000 }).should('not.exist');
    });
  });
});