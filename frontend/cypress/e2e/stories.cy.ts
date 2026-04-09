describe('CheckIT - Stories & User Flow', () => {

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
    cy.contains('Geteilte Liste erstellen').should('be.visible').click();
    cy.get('input').first().type('Mein Wocheneinkauf', { force: true });
    cy.contains("Erstellen & Teilen").click();

    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Mein Wocheneinkauf').should('be.visible');
  });

  it('2. Einkaufsliste: Fügt einen Artikel hinzu und löscht ihn wieder', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Party-Liste');
    cy.contains("Erstellen & Teilen").click();
    
    cy.url().should('include', '/list/');
    cy.wait(500); 

    cy.get('input').eq(0).type('Chips');
    cy.get('input').eq(2).type('3 Packungen');
    cy.get('.mdi-plus').closest('button').click();

    cy.contains('td', 'Chips', { timeout: 10000 }).should('be.visible');

    cy.get('.mdi-delete').first().closest('button').click();
    cy.contains('Die Liste ist leer.', { timeout: 10000 }).should('be.visible');
  });

  it('3. Einstellungen: Wechselt in die Einstellungen (aus einer Liste heraus)', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Settings-Liste');
    cy.contains("Erstellen & Teilen").click();
    
    cy.get('.mdi-cog', { timeout: 10000 }).should('be.visible').closest('a').click();

    cy.contains('Einstellungen').should('be.visible');

    cy.contains('Leeren').click();
    cy.visit('/'); 
    cy.contains('Geteilte Liste erstellen').should('be.visible');
  });

  it('4. Kategorien: Prüft die manuelle Auswahl', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Obst-Liste');
    cy.contains("Erstellen & Teilen").click();
    
    cy.url().should('include', '/list/');
    cy.wait(500);

    cy.get('input').eq(0).clear().type('Apfel');

    // KUGELSICHERER VUETIFY FIX: Wir klicken direkt in das klickbare v-field
    cy.get('.v-select').first().find('.v-field').click({ force: true });
    cy.wait(1000); // Dem Menü genug Zeit zum Ausfahren geben

    // Wir suchen auf der ganzen Seite nach dem Text und klicken das allerletzte Element (das offene Menü)
    cy.get('body').contains('Obst & Gemüse').last().click({ force: true });

    cy.get('input').eq(2).clear().type('5');
    cy.get('.mdi-plus').closest('button').click();

    cy.contains('td', 'Obst & Gemüse', { timeout: 10000 }).should('be.visible');
    cy.contains('td', 'Apfel').should('be.visible');
  });

  it('5. Einkaufsliste: Artikel nachträglich bearbeiten', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Edit-Liste', { force: true });
    cy.contains("Erstellen & Teilen").click();
    
    cy.url().should('include', '/list/');
    cy.wait(500);

    // Artikel hinzufügen
    cy.get('input').eq(0).type('Alter Name');
    cy.get('input').eq(2).type('1');
    cy.get('.mdi-plus').closest('button').click();
    cy.contains('td', 'Alter Name', { timeout: 10000 }).should('be.visible');

    // Auf den Stift (Bearbeiten) klicken
    cy.get('.mdi-pencil').first().closest('button').click();
    cy.contains('Artikel bearbeiten').should('be.visible');

    // Name und Menge ändern
    cy.get('.v-dialog').find('input').eq(0).clear().type('Neuer Name', { force: true });
    cy.get('.v-dialog').find('input').eq(1).clear().type('5 kg', { force: true });
    cy.contains('Speichern').click();

    // Prüfen ob die Änderungen übernommen wurden
    cy.contains('td', 'Neuer Name', { timeout: 10000 }).should('be.visible');
    cy.contains('td', '5 kg').should('be.visible');
    cy.contains('td', 'Alter Name').should('not.exist');
  });

  it('6. Einkaufsliste: Artikel suchen und filtern', () => {
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Search-Liste', { force: true });
    cy.contains("Erstellen & Teilen").click();
    
    cy.url().should('include', '/list/');
    cy.wait(500);

    // Zwei verschiedene Artikel hinzufügen
    cy.get('input').eq(0).clear().type('Apfel');
    cy.get('.mdi-plus').closest('button').click();
    
    cy.get('input').eq(0).clear().type('Banane');
    cy.get('.mdi-plus').closest('button').click();

    cy.contains('td', 'Apfel', { timeout: 10000 }).should('be.visible');
    cy.contains('td', 'Banane').should('be.visible');

    // Ins Suchfeld tippen
    cy.get('input').eq(0).clear().type('Apf');

    // Prüfen ob korrekt gefiltert wurde
    cy.contains('td', 'Apfel').should('be.visible');
    cy.contains('td', 'Banane').should('not.exist');
  });

  it('EK Feature: Erstellt eine private (anonyme) Liste und blockiert Fremdzugriff', () => {
    cy.contains('Private (anonyme) Liste').should('be.visible').click();
    cy.get('input').first().type('Meine Geheimliste', { force: true });
    cy.contains('Anonym starten').click();

    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Privat').should('be.visible');
    cy.get('.mdi-share-variant').should('not.exist');

    // Fremdzugriff simulieren (LocalStorage löschen)
    cy.clearLocalStorage('checkit_anon_lists');
    cy.reload();

    cy.contains('Zugriff verweigert', { timeout: 10000 }).should('be.visible');
    cy.contains('keine Berechtigung').should('be.visible');
    cy.get('input[label="Artikel..."]').should('not.exist');
  });

  it('EK Feature: Zeitstempel bei Artikeländerungen (Mobile Ansicht)', () => {
    cy.viewport('iphone-x');

    cy.contains('Geteilte Liste erstellen').should('be.visible').click();
    cy.get('input').first().type('Zeit-Test', { force: true });
    cy.contains("Erstellen & Teilen").click();

    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Die Liste ist leer.').should('be.visible');

    cy.get('input').first().type('Zeit-Artikel');
    cy.get('.mdi-plus').closest('button').click();

    cy.get('.v-list').contains('Zeit-Artikel').should('be.visible');
    cy.get('.v-list').find('.mdi-clock-outline').should('be.visible');
  });
});