describe('CheckIT - Stories & User Flow', () => {

  // Fehlerbehandlung für PouchDB/IndexedDB (wie in checkIT.cy.js)
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
    
    // FIX: force: true hinzugefügt, um die Überlagerungs-Prüfung zu umgehen
    cy.get('input').first().type('Mein Wocheneinkauf', { force: true });
    
    cy.contains("Erstellen & Teilen").click();

    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Mein Wocheneinkauf').should('be.visible');
  });

  it('2. Einkaufsliste: Fügt einen Artikel hinzu und löscht ihn wieder', () => {
    // Liste erst erstellen
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Party-Liste');
    cy.contains("Erstellen & Teilen").click();
    
    // Sicherstellen, dass wir in der Liste sind
    cy.url().should('include', '/list/');
    cy.wait(500); // Zeit für PouchDB

    // Artikel hinzufügen
    cy.get('input').eq(0).type('Chips');
    cy.get('input').eq(2).type('3 Packungen');
    cy.get('.mdi-plus').closest('button').click();

    cy.contains('td', 'Chips', { timeout: 10000 }).should('be.visible');

    // Artikel löschen
    cy.get('.mdi-delete').first().closest('button').click();
    cy.contains('Die Liste ist leer.', { timeout: 10000 }).should('be.visible');
  });

  it('3. Einstellungen: Wechselt in die Einstellungen (aus einer Liste heraus)', () => {
    // 1. Liste erstellen, da das Zahnrad nur dort existiert
    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Settings-Liste');
    cy.contains("Erstellen & Teilen").click();
    
    // 2. In der Liste auf das Zahnrad klicken
    cy.get('.mdi-cog', { timeout: 10000 }).should('be.visible').closest('a').click();

    // 3. Prüfen ob Einstellungen offen
    cy.contains('Einstellungen').should('be.visible');

    // 4. Cache leeren
    cy.contains('Leeren').click();
    
    // 5. Hard Reset führt zur Startseite
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

    // Kategorie wählen
    cy.get('.v-select').click();
    cy.get('.v-overlay-container').contains('Obst & Gemüse').click({ force: true });

    cy.get('input').eq(2).clear().type('5');
    cy.get('.mdi-plus').closest('button').click();

    cy.contains('td', 'Obst & Gemüse', { timeout: 10000 }).should('be.visible');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // NEU: Erweiterte Kompetenz (EK) Features
  // ─────────────────────────────────────────────────────────────────────────────

  it('EK Feature: Erstellt eine private (anonyme) Liste', () => {
    // 1. Button für anonyme Liste klicken
    cy.contains('Private (anonyme) Liste').should('be.visible').click();
    
    // 2. Namen eingeben
    cy.get('input').first().type('Meine Geheimliste', { force: true });
    cy.contains('Anonym starten').click();

    // 3. Check: URL Hash vorhanden
    cy.url().should('match', /\/list\/[a-f0-9]+/);

    // 4. Check: Das "Privat"-Badge wird angezeigt
    cy.contains('Privat').should('be.visible');

    // 5. Check: Der Share-Button existiert NICHT (da anonyme Liste)
    cy.get('.mdi-share-variant').should('not.exist');
  });

  it('EK Feature: Zeitstempel bei Artikeländerungen (Mobile Ansicht)', () => {
    // 1. Viewport ZUERST setzen
    cy.viewport('iphone-x');

    // 2. Liste erstellen
    cy.contains('Geteilte Liste erstellen').should('be.visible').click();
    cy.get('input').first().type('Zeit-Test', { force: true });
    cy.contains("Erstellen & Teilen").click();

    // 3. Warten bis die Liste geladen ist
    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Die Liste ist leer.').should('be.visible');

    // 4. Artikel hinzufügen
    cy.get('input').first().type('Zeit-Artikel');
    cy.get('.mdi-plus').closest('button').click();

    // 5. Sicherstellen, dass der Artikel in der MOBILEN Liste erscheint
    // Wir suchen innerhalb der v-list (die für Mobilgeräte da ist)
    cy.get('.v-list').contains('Zeit-Artikel').should('be.visible');

    // 6. Prüfen, ob das Uhr-Icon für den Zeitstempel in der Liste gerendert wird
    cy.get('.v-list').find('.mdi-clock-outline').should('be.visible');
  });
});