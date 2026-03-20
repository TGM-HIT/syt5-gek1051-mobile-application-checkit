describe('CheckIT Einkaufs-App - User Flow', () => {

  // Vor jedem Test rufen wir die Startseite auf
  // und fangen die API-Anfragen ab, damit der Test nicht vom echten Backend abhängt
  beforeEach(() => {
    // WICHTIG: Port wieder auf 3000 gesetzt, da axios in deinem Vue-Code dorthin funkt!
    // API GET abfangen und mit leeren Daten antworten
    cy.intercept('GET', 'http://localhost:3000/list', {
      statusCode: 200,
      body: []
    }).as('getItems');

    // API POST abfangen
    cy.intercept('POST', 'http://localhost:3000/list', (req) => {
      req.reply({
        statusCode: 201,
        body: { id: Date.now(), ...req.body }
      });
    }).as('addItem');

    cy.visit('/');
  });

  it('1. Startseite: Erstellt eine neue Einkaufsliste', () => {
    // Button anklicken, um das Eingabefeld zu öffnen
    cy.contains('Einkaufsliste erstellen').click();

    // Namen in das Textfeld eingeben (Vuetify nutzt interne <input> Tags)
    cy.get('input').first().type('Mein Wocheneinkauf');

    // Auf den "Los geht's!" Button klicken
    cy.contains("Los geht's!").click();

    // Prüfen, ob die Weiterleitung geklappt hat und der Name oben steht
    cy.url().should('include', '/list?list=Mein+Wocheneinkauf');
    cy.contains('Mein Wocheneinkauf').should('be.visible');
  });

  it('2. Einkaufsliste: Fügt einen Artikel hinzu und löscht ihn wieder', () => {
    // Direkter Sprung auf die Listen-Seite
    cy.visit('/list?list=Party-Einkauf');
    
    // HIER IST DIE ÄNDERUNG: Wir geben Cypress bis zu 20 Sekunden (20000ms) Zeit
    cy.wait('@getItems', { timeout: 20000 }); 

    // --- ARTIKEL HINZUFÜGEN ---
    // Vuetify hat hier zwei Textfelder nebeneinander: 0 = Name, 1 = Menge
    cy.get('input').eq(0).type('Chips');
    cy.get('input').eq(1).type('3 Packungen');
    cy.contains('HINZUFÜGEN').click();

    // Warten auf den simulierten POST-Request
    cy.wait('@addItem');

    // Prüfen, ob "Chips" und "3 Packungen" in der Tabelle stehen
    cy.contains('Chips').should('be.visible');
    cy.contains('3 Packungen').should('be.visible');

    // --- ARTIKEL ALS ERLEDIGT MARKIEREN ---
    // API PUT abfangen
    cy.intercept('PUT', 'http://localhost:3000/list/*').as('updateItem');
    cy.get('input[type="checkbox"]').check();
    cy.wait('@updateItem');

    // --- ARTIKEL LÖSCHEN ---
    cy.intercept('DELETE', 'http://localhost:3000/list/*').as('deleteItem');
    cy.contains('🗑️').click();
    cy.wait('@deleteItem');

    // Prüfen, ob die Liste wieder den Leer-Status anzeigt
    cy.contains('Die Liste ist leer.').should('be.visible');
  });

  it('3. Einstellungen: Wechselt in die Einstellungen und leert den Cache', () => {
    cy.visit('/list');
    
    // Auf das Zahnrad klicken
    cy.contains('⚙️').click();

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

  //Kategorien Test
  it('4. Kategorien: Prüft die automatische Zuordnung und manuelle Auswahl', () => {
      cy.visit('/list/test-hash-123');

      //Automatische Zuordnung zu Sonstiges
      cy.get('input').eq(0).type('Batterien');
      cy.get('input').eq(2).type('4 Stück');
      cy.contains('mdi-plus').parent().click();

      cy.contains('Sonstiges').should('be.visible');
      cy.contains('Batterien').should('be.visible');

      // Manuelle Auswahl Obst & Gemüse
      cy.get('input').eq(0).clear().type('Apfel');

      cy.get('.v-select').click();
      cy.get('.v-overlay-container').contains('Obst & Gemüse').click();

      cy.get('input').eq(2).clear().type('5');
      cy.contains('mdi-plus').parent().click();

      cy.contains('Obst & Gemüse').should('be.visible');
      cy.contains('Apfel').should('be.visible');
    });

});