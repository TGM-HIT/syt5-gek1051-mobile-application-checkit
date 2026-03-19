describe('CheckIT Einkaufs-App - User Flow', () => {

  // Auth-Cookie setzen, damit der Router-Guard für die Startseite nicht auf /login weiterleitet
  beforeEach(() => {
    cy.setCookie('checkit_username', 'testuser');
  });

  it('1. Startseite: Erstellt eine neue Einkaufsliste', () => {
    cy.visit('/');

    // Button anklicken, um das Eingabefeld zu öffnen
    cy.contains('Einkaufsliste erstellen').click();

    // Namen in das Textfeld eingeben (Vuetify nutzt interne <input> Tags)
    cy.get('input').first().type('Mein Wocheneinkauf');

    // Auf den "Los geht's!" Button klicken
    cy.contains("Los geht's!").click();

    // Prüfen, ob die Weiterleitung zu einer Listen-Seite mit Hash geklappt hat
    // (Die App navigiert jetzt zu /list/<hash> statt /list?list=...)
    cy.url().should('include', '/list/');
    cy.contains('Mein Wocheneinkauf').should('be.visible');
  });

  it('2. Einkaufsliste: Fügt einen Artikel hinzu und löscht ihn wieder', () => {
    // Direkter Sprung auf eine Listen-Seite (Route ist jetzt /list/:hash)
    cy.visit('/list/test-einkauf');

    // --- ARTIKEL HINZUFÜGEN ---
    // Vuetify hat hier zwei Textfelder nebeneinander: 0 = Name, 1 = Menge
    cy.get('input').eq(0).type('Chips');
    cy.get('input').eq(1).type('3 Packungen');
    cy.contains('HINZUFÜGEN').click();

    // Prüfen, ob "Chips" und "3 Packungen" in der Tabelle stehen
    cy.contains('Chips').should('be.visible');
    cy.contains('3 Packungen').should('be.visible');

    // --- ARTIKEL ALS ERLEDIGT MARKIEREN ---
    cy.get('input[type="checkbox"]').check();

    // --- ARTIKEL LÖSCHEN ---
    // Der Löschen-Button verwendet jetzt das mdi-delete Icon (kein 🗑️ Emoji mehr)
    cy.get('i.mdi-delete').click();

    // Prüfen, ob die Liste wieder den Leer-Status anzeigt
    cy.contains('Die Liste ist leer.').should('be.visible');
  });

  it('3. Einstellungen: Wechselt in die Einstellungen und leert den Cache', () => {
    cy.visit('/list/test-einkauf');

    // Auf den Einstellungen-Button klicken (mdi-cog Icon, kein ⚙️ Emoji mehr)
    cy.get('a[href="/settings"]').click();

    // Prüfen ob wir in den Einstellungen sind
    cy.contains('Einstellungen').should('be.visible');

    // Cache leeren Button klicken
    cy.contains('Leeren').click();

    // Prüfen ob die Snackbar mit der Erfolgsmeldung auftaucht
    cy.contains('Cache wurde geleert').should('exist');

    // Zurück zur Liste klicken
    cy.contains('Fertig').click();
    cy.url().should('include', '/list');
  });

});
