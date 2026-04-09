describe('CheckIT - Stories & User Flow', () => {

  // Fehlerbehandlung für PouchDB/IndexedDB
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

    cy.get('.v-select').first().click({ force: true });
    cy.get('.v-overlay-container').contains('Obst & Gemüse').first().click({ force: true });

    cy.get('input').eq(2).clear().type('5');
    cy.get('.mdi-plus').closest('button').click();

    cy.contains('td', 'Obst & Gemüse', { timeout: 10000 }).should('be.visible');
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // NEU: Erweiterte Kompetenz (EK) Features
  // ─────────────────────────────────────────────────────────────────────────────

  it('EK Feature: Erstellt eine private (anonyme) Liste und blockiert Fremdzugriff', () => {
    // 1. Private Liste erstellen
    cy.contains('Private (anonyme) Liste').should('be.visible').click();
    cy.get('input').first().type('Meine Geheimliste', { force: true });
    cy.contains('Anonym starten').click();

    // 2. Prüfen, ob die Liste korrekt erstellt wurde
    cy.url().should('match', /\/list\/[a-f0-9]+/);
    cy.contains('Privat').should('be.visible');
    
    // Share-Button darf bei privaten Listen nicht existieren
    cy.get('.mdi-share-variant').should('not.exist');

    // 3. Fremdzugriff simulieren (LocalStorage löschen = anderer User/Gerät)
    cy.clearLocalStorage('checkit_anon_lists');
    
    // Seite neu laden (wir tun so, als ob jemand den Link gerade frisch öffnet)
    cy.reload();

    // 4. Prüfen, ob die Sicherheitsbarriere funktioniert
    cy.contains('Zugriff verweigert', { timeout: 10000 }).should('be.visible');
    cy.contains('keine Berechtigung').should('be.visible');
    
    // Sicherstellen, dass die Eingabefelder versteckt wurden
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