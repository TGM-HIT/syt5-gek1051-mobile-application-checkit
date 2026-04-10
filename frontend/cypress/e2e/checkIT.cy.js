describe('CheckIT Einkaufs-App - User Flow', () => {

  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes("Failed to execute 'transaction' on 'IDBDatabase'")) {
      return false; 
    }
    return true; 
  });

  beforeEach(() => {
    cy.setupAuth();
    cy.visit('/');
  });

  it('1. Startseite: Erstellt eine neue Einkaufsliste', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Mein Wocheneinkauf');
    cy.contains("Erstellen & Teilen").click();

    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Mein Wocheneinkauf').should('be.visible');
  });

  it('2. Einkaufsliste: Fügt einen Artikel hinzu und löscht ihn wieder', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Party-Einkauf');
    cy.contains("Erstellen & Teilen").click();

    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Die Liste ist leer.').should('be.visible');
    cy.wait(500);

    cy.get('input').eq(0).type('Chips');
    cy.get('input').eq(2).type('3 Packungen');
    cy.get('.mdi-plus').closest('button').click();

    cy.contains('td', 'Chips', { timeout: 10000 }).should('be.visible');
    cy.contains('td', '3 Packungen').should('be.visible');

    cy.get('.mdi-delete').first().closest('button').click();
    cy.contains('Die Liste ist leer.', { timeout: 10000 }).should('be.visible');
  });

  it('3. Einstellungen: Wechselt in die Einstellungen und leert den Cache', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Settings-Test');
    cy.contains("Erstellen & Teilen").click();
    cy.url().should('match', /\/list\/[a-f0-9]+/);

    cy.get('.mdi-cog').closest('a').click();
    cy.contains('Einstellungen').should('be.visible');

    cy.contains('Leeren').click();
    cy.visit('/');
    
    cy.contains('Geteilte Liste erstellen').should('be.visible');
  });

  it('4. Kategorien: Prüft die manuelle Auswahl', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Obst-Liste');
    cy.contains("Erstellen & Teilen").click();
    
    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Die Liste ist leer.').should('be.visible');

    cy.get('input').eq(0).clear().type('Apfel');

    // KUGELSICHERER VUETIFY FIX
    cy.get('.v-select').first().find('.v-field').click({ force: true });
    cy.wait(1000); 

    cy.get('body').contains('Obst & Gemüse').last().click({ force: true });

    cy.get('input').eq(2).clear().type('5');
    cy.get('.mdi-plus').closest('button').click();

    cy.contains('td', 'Obst & Gemüse', { timeout: 10000 }).should('be.visible');
    cy.contains('td', 'Apfel').should('be.visible');
  });
});