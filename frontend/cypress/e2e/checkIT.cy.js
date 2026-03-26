describe('CheckIT Einkaufs-App - User Flow', () => {

  beforeEach(() => {
    cy.setCookie('checkit_username', 'testuser');
    cy.viewport(1280, 720);
  });

  it('1. Startseite: Erstellt eine neue Einkaufsliste', () => {
    cy.visit('/');

    // Button anklicken, um das Eingabefeld zu öffnen
    cy.contains('Einkaufsliste erstellen').click();

    // Namen in das Textfeld eingeben
    cy.get('input').first().type('Mein Wocheneinkauf');

    // Auf den "Los geht's!" Button klicken
    cy.contains("Los geht's!").click();

    // Prüfen, ob die Weiterleitung zu einer Listen-Seite geklappt hat
    cy.url().should('include', '/list/');
    cy.contains('Mein Wocheneinkauf').should('be.visible');
  });

  it('2. Einkaufsliste: Fügt einen Artikel hinzu und löscht ihn wieder', () => {
    cy.visit('/list/test-einkauf');

    // --- ARTIKEL HINZUFÜGEN ---
    // Inputs: 0 = Artikel, 1 = Kategorie (v-select), 2 = Menge, 3 = Preis
    cy.get('input').eq(0).type('Chips');
    cy.get('input').eq(2).type('3 Packungen');

    // Add-Button klicken (mdi-plus Icon)
    cy.get('i.mdi-plus').click();

    // Prüfen, ob "Chips" und "3 Packungen" sichtbar sind
    cy.contains('Chips').should('be.visible');
    cy.contains('3 Packungen').should('be.visible');

    // --- ARTIKEL ALS ERLEDIGT MARKIEREN ---
    cy.get('input[type="checkbox"]').first().check({ force: true });

    // --- ARTIKEL LÖSCHEN ---
    cy.get('i.mdi-delete').first().click();

    // Prüfen, ob die Liste wieder den Leer-Status anzeigt
    cy.contains('Die Liste ist leer.').should('be.visible');
  });

  it('3. Einstellungen: Wechselt in die Einstellungen und leert den Cache', () => {
    cy.visit('/list/test-einkauf');

    // Auf den Einstellungen-Button klicken (v-btn mit to="/settings")
    cy.get('a[href="/settings"]').click();

    // Prüfen ob wir in den Einstellungen sind
    cy.contains('Einstellungen').should('be.visible');

    // Cache leeren Button klicken
    cy.contains('Leeren').click();

    // Prüfen ob die Snackbar mit der Erfolgsmeldung auftaucht
    cy.contains('Cache wurde geleert').should('exist');

    // Zurück navigieren
    cy.contains('Fertig').click();
  });

  it('4. Kategorien: Prüft die Standard-Kategorie und manuelle Auswahl', () => {
    cy.visit('/list/test-hash-123');

    // --- Artikel mit Standard-Kategorie "Sonstiges" hinzufügen ---
    cy.get('input').eq(0).type('Batterien');
    cy.get('input').eq(2).type('4 Stück');
    cy.get('i.mdi-plus').click();

    // Standard-Kategorie ist "Sonstiges"
    cy.contains('Sonstiges').should('be.visible');
    cy.contains('Batterien').should('be.visible');

    // --- Artikel mit manueller Kategorie "Obst & Gemüse" hinzufügen ---
    cy.get('input').eq(0).type('Apfel');

    // Kategorie-Dropdown öffnen und "Obst & Gemüse" auswählen
    cy.get('.v-select').click();
    cy.get('.v-overlay-container').contains('Obst & Gemüse').click();

    cy.get('input').eq(2).type('5');
    cy.get('i.mdi-plus').click();

    cy.contains('Obst & Gemüse').should('be.visible');
    cy.contains('Apfel').should('be.visible');
  });

});
