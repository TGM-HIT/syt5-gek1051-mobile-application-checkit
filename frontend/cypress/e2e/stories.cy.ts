
/** Navigiert zur Startseite und legt eine neue Liste an. Gibt den Hash zurück. */
function createListAndGetPath(listName: string): Cypress.Chainable<string> {
    cy.visit('/');
    cy.contains('Einkaufsliste erstellen').click();
    cy.get('input').first().type(listName);
    cy.contains("Los geht's!").click();
    return cy.url().then(url => new URL(url).pathname); // /list/<hash>
}

// ─────────────────────────────────────────────────────────────────────────────
// Story: Einkaufsliste erstellen
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Einkaufsliste erstellen', () => {
    beforeEach(() => {
        cy.setupAuth();
    });

    it('erstellt eine neue Liste und leitet auf /list/<hash> weiter', () => {
        cy.visit('/');
        cy.contains('Einkaufsliste erstellen').click();
        cy.get('input').first().type('Wocheneinkauf');
        cy.contains("Los geht's!").click();

        // URL enthält /list/ gefolgt von einem Hash
        cy.url().should('match', /\/list\/[a-f0-9]+/);
    });

    it('zeigt den Listennamen in der Überschrift der ListView', () => {
        cy.visit('/');
        cy.contains('Einkaufsliste erstellen').click();
        cy.get('input').first().type('Mein Markt');
        cy.contains("Los geht's!").click();

        cy.contains('Mein Markt').should('be.visible');
    });

    it('der "Los geht\'s!"-Button ist deaktiviert solange kein Name eingegeben wurde', () => {
        cy.visit('/');
        cy.contains('Einkaufsliste erstellen').click();
        // Button direkt nach dem Öffnen – noch kein Text
        cy.contains("Los geht's!").should('be.disabled');
    });

    it('erhöht den globalen Listenzähler nach dem Erstellen', () => {
        cy.visit('/');
        cy.contains('Einkaufsliste erstellen').click();
        cy.get('input').first().type('Zähler-Test');
        cy.contains("Los geht's!").click();

        // Zurück zur Startseite, dort zeigt der Chip den Zählerstand an
        cy.visit('/');
        cy.get('.v-chip').contains('erstellt').should('be.visible');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Artikel hinzufügen + Kategorie-Dropdown
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Artikel hinzufügen mit Kategorie-Dropdown', () => {
    let listPath = '';

    before(() => {
        cy.setupAuth();
        createListAndGetPath('Artikel-Test-Liste').then(p => { listPath = p; });
    });

    beforeEach(() => {
        cy.setupAuth();
        cy.then(() => cy.visit(listPath));
    });

    it('fügt einen Artikel mit Standardkategorie "Sonstiges" hinzu', () => {
        cy.get('input').first().type('Batterien');
        cy.get('.mdi-plus').closest('button').click();

        cy.contains('td', 'Batterien').should('be.visible');
    });

    it('fügt einen Artikel mit manuell gewählter Kategorie "Obst & Gemüse" hinzu', () => {
        cy.get('input').first().type('Apfel');

        // Kategorie-Select öffnen und Eintrag wählen
        cy.get('.v-select').first().click();
        cy.get('.v-overlay-container').contains('Obst & Gemüse').click();

        cy.get('.mdi-plus').closest('button').click();

        cy.contains('td', 'Apfel').should('be.visible');
    });

    it('zeigt das Kategorie-Dropdown mit allen erwarteten Einträgen', () => {
        cy.get('.v-select').first().click();
        const categories = [
            'Obst & Gemüse', 'Milchprodukte', 'Backwaren',
            'Fleisch/Fisch', 'Tiefkühl', 'Drogerie', 'Haushalt', 'Sonstiges'
        ];
        categories.forEach(cat => {
            cy.get('.v-overlay-container').contains(cat).should('exist');
        });
        // Dropdown wieder schließen
        cy.get('body').type('{esc}');
    });

    it('zeigt "Die Liste ist leer." wenn noch kein Artikel vorhanden ist', () => {
        // Neue frische Liste aufrufen
        cy.visit('/');
        cy.setupAuth();
        cy.contains('Einkaufsliste erstellen').click();
        cy.get('input').first().type('Leere Liste');
        cy.contains("Los geht's!").click();

        cy.contains('Die Liste ist leer.').should('be.visible');
    });

    it('fügt einen Artikel per Enter-Taste hinzu', () => {
        cy.get('input').first().type('Brot{enter}');
        cy.contains('td', 'Brot').should('be.visible');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Artikel löschen
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Artikel löschen', () => {
    beforeEach(() => {
        cy.setupAuth();
        createListAndGetPath('Löschen-Test');
        cy.addListItem('ZuLoeschenderArtikel');
    });

    it('zeigt ein Löschen-Icon (mdi-delete) bei jedem Artikel', () => {
        cy.get('.mdi-delete').should('be.visible');
    });

    it('entfernt den Artikel sofort aus der UI nach Klick auf das Löschen-Icon', () => {
        cy.contains('td', 'ZuLoeschenderArtikel').should('be.visible');
        cy.get('.mdi-delete').first().closest('button').click();
        cy.contains('td', 'ZuLoeschenderArtikel').should('not.exist');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Artikel-Name nachträglich bearbeiten
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Artikelname bearbeiten', () => {
    beforeEach(() => {
        cy.setupAuth();
        createListAndGetPath('Bearbeiten-Test');
        cy.addListItem('AlterName');
    });

    it('öffnet den Bearbeiten-Dialog per Klick auf das Stift-Icon', () => {
        cy.get('.mdi-pencil').first().closest('button').click();
        cy.contains('Artikel bearbeiten').should('be.visible');
    });

    it('speichert den geänderten Namen und zeigt ihn in der Tabelle', () => {
        cy.get('.mdi-pencil').first().closest('button').click();
        cy.contains('Artikel bearbeiten').should('be.visible');

        // Name-Feld leeren und neuen Namen eingeben
        cy.get('.v-dialog').find('input').first().clear().type('NeuerName');
        cy.get('.v-dialog').contains('Speichern').click();

        cy.contains('td', 'NeuerName').should('be.visible');
        cy.contains('td', 'AlterName').should('not.exist');
    });

    it('verwirft Änderungen bei Klick auf "Abbrechen"', () => {
        cy.get('.mdi-pencil').first().closest('button').click();
        cy.get('.v-dialog').find('input').first().clear().type('WirdNichtGespeichert');
        cy.get('.v-dialog').contains('Abbrechen').click();

        cy.contains('td', 'AlterName').should('be.visible');
        cy.contains('td', 'WirdNichtGespeichert').should('not.exist');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Artikel als erledigt markieren (Checkbox)
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Artikel als erledigt markieren', () => {
    beforeEach(() => {
        cy.setupAuth();
        createListAndGetPath('Checkbox-Test');
        cy.addListItem('ZuErledigenderArtikel');
    });

    it('markiert einen Artikel als erledigt und zeigt Durchstreichung', () => {
        cy.get('input[type="checkbox"]').first().check({ force: true });
        cy.contains('ZuErledigenderArtikel')
            .closest('span, td')
            .should('have.class', 'done-text');
    });

    it('kann einen erledigten Artikel wieder als unerledigt markieren', () => {
        cy.get('input[type="checkbox"]').first().check({ force: true });
        cy.get('input[type="checkbox"]').first().uncheck({ force: true });
        cy.contains('ZuErledigenderArtikel')
            .closest('span, td')
            .should('not.have.class', 'done-text');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Artikel suchen
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Nach Artikel suchen', () => {
    beforeEach(() => {
        cy.setupAuth();
        createListAndGetPath('Such-Test');
        cy.addListItem('Schokolade');
        cy.addListItem('Salz');
    });

    it('filtert die Tabelle nach Eingabe eines Suchbegriffs', () => {
        cy.get('input').first().clear().type('Schoko');
        cy.contains('td', 'Schokolade').should('be.visible');
        cy.contains('td', 'Salz').should('not.exist');
    });

    it('zeigt wieder alle Artikel wenn der Suchbegriff gelöscht wird', () => {
        cy.get('input').first().clear().type('Schoko');
        cy.get('input').first().clear();
        cy.contains('td', 'Schokolade').should('be.visible');
        cy.contains('td', 'Salz').should('be.visible');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Offline-Warnung (Banner)
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Offline-Warnung', () => {
    let listPath = '';

    before(() => {
        cy.setupAuth();
        createListAndGetPath('Offline-Banner-Test').then(p => { listPath = p; });
    });

    beforeEach(() => {
        cy.setupAuth();
        cy.then(() => cy.visit(listPath + '?debug=true'));
        cy.contains('button', 'Online', { timeout: 10000 }).should('be.visible');
    });

    it('zeigt keinen Offline-Banner wenn online', () => {
        cy.get('.v-alert').contains('Du bist offline').should('not.exist');
    });

    it('zeigt den Offline-Banner sofort wenn offline geschaltet wird', () => {
        cy.goOffline();
        cy.get('.v-alert').contains('Du bist offline').should('be.visible');
    });

    it('der Offline-Banner verschwindet wieder wenn online geschaltet wird', () => {
        cy.goOffline();
        cy.get('.v-alert').contains('Du bist offline').should('be.visible');
        cy.goOnline();
        cy.get('.v-alert').contains('Du bist offline').should('not.exist');
    });

    it('zeigt den Offline-Banner bei echtem browser offline-Event', () => {
        cy.triggerBrowserOffline();
        cy.get('.v-alert').contains('Du bist offline').should('be.visible');
        cy.triggerBrowserOnline();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Offline-Betrieb – Änderungen ohne Einschränkung lokal speichern
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Offline-Betrieb ohne Einschränkungen', () => {
    let listPath = '';

    before(() => {
        cy.setupAuth();
        createListAndGetPath('Offline-Betrieb-Test').then(p => { listPath = p; });
    });

    beforeEach(() => {
        cy.setupAuth();
        cy.then(() => cy.visit(listPath + '?debug=true'));
        cy.contains('button', 'Online', { timeout: 10000 }).should('be.visible');
        cy.goOffline();
    });

    it('kann offline einen Artikel hinzufügen', () => {
        cy.addListItem('Offline-Artikel');
        cy.contains('td', 'Offline-Artikel').should('be.visible');
    });

    it('kann offline einen Artikel löschen', () => {
        cy.addListItem('WirdOfflineGeloescht');
        cy.contains('td', 'WirdOfflineGeloescht').closest('tr').find('.mdi-delete').closest('button').click();
        cy.contains('td', 'WirdOfflineGeloescht').should('not.exist');
    });

    it('kann offline einen Artikel als erledigt markieren', () => {
        cy.addListItem('OfflineErledigt');
        cy.get('input[type="checkbox"]').first().check({ force: true });
        // Kein Fehler-Snackbar soll erscheinen
        cy.get('.v-snackbar').contains('Speichern fehlgeschlagen').should('not.exist');
    });

    it('zeigt den orangen Warn-Snackbar beim Wechsel in den Offline-Modus', () => {
        // Bereits offline (aus beforeEach) – Snackbar sollte vorhanden sein
        cy.get('.v-snackbar').should('exist').and('contain', 'Kein Internet');
    });

    it('zeigt nach dem Reconnect den grünen Snackbar', () => {
        cy.contains('.v-snackbar', 'Schließen').click({ force: true });
        cy.goOnline();
        cy.get('.v-snackbar').should('exist').and('contain', 'Wieder online');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: 6-stelligen Einladungscode generieren
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Einladungscode generieren', () => {
    let listPath = '';

    before(() => {
        cy.setupAuth();
        createListAndGetPath('Share-Test').then(p => { listPath = p; });
    });

    beforeEach(() => {
        cy.setupAuth();
        cy.then(() => cy.visit(listPath));
    });

    it('öffnet den "Liste teilen"-Dialog per Klick auf den Share-Button', () => {
        cy.get('.mdi-share-variant').closest('button').click();
        cy.contains('Liste teilen').should('be.visible');
    });

    it('zeigt einen 6-stelligen alphanumerischen Einladungscode', () => {
        cy.get('.mdi-share-variant').closest('button').click();
        cy.get('.invite-code-box', { timeout: 10000 })
            .invoke('text')
            .then(text => {
                const code = text.trim().replace(/\s/g, '');
                expect(code).to.have.length(6);
                expect(code).to.match(/^[A-Z0-9]{6}$/);
            });
    });

    it('zeigt die Gültigkeitsdauer "24 Stunden" an', () => {
        cy.get('.mdi-share-variant').closest('button').click();
        cy.contains('24 Stunden').should('be.visible');
    });

    it('zeigt den direkten Share-Link an', () => {
        cy.get('.mdi-share-variant').closest('button').click();
        cy.get('.v-dialog input[readonly]').should('contain.value', '/list/');
    });

    it('schließt den Dialog per "Schließen"-Button', () => {
        cy.get('.mdi-share-variant').closest('button').click();
        cy.contains('Schließen').click();
        cy.contains('Liste teilen').should('not.exist');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Einladungscode einlösen (HomeView)
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Einladungscode einlösen', () => {
    beforeEach(() => {
        cy.setupAuth();
        cy.visit('/');
    });

    it('zeigt den "Einladungscode einlösen"-Bereich auf der Startseite', () => {
        cy.contains('Einladungscode einlösen').should('be.visible');
        cy.contains('Beitreten').should('be.visible');
    });

    it('"Beitreten"-Button ist deaktiviert solange kein gültiger Code eingegeben wurde', () => {
        cy.contains('Beitreten').should('be.disabled');
    });

    it('zeigt eine Fehlermeldung bei ungültigem Code', () => {
        // 6-stelligen Code eingeben, der nicht in der DB existiert
        cy.get('.invite-input input').type('AAAAAA');
        cy.contains('Beitreten').click();
        cy.contains('Ungültiger oder abgelaufener Code').should('be.visible');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Alle eigenen Listen auf der Startseite anzeigen
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Eigene Listen auf der Startseite anzeigen', () => {
    before(() => {
        cy.setupAuth();
        // Zwei Listen erstellen
        cy.visit('/');
        cy.contains('Einkaufsliste erstellen').click();
        cy.get('input').first().type('MeineListe1');
        cy.contains("Los geht's!").click();
        cy.url().should('include', '/list/');

        cy.visit('/');
        cy.contains('Einkaufsliste erstellen').click();
        cy.get('input').first().type('MeineListe2');
        cy.contains("Los geht's!").click();
        cy.url().should('include', '/list/');
    });

    it('zeigt den Abschnitt "Deine Listen" auf der Startseite', () => {
        cy.setupAuth();
        cy.visit('/');
        cy.contains('Deine Listen').should('be.visible');
    });

    it('zeigt die erstellten Listen in der Übersicht', () => {
        cy.setupAuth();
        cy.visit('/');
        cy.contains('MeineListe1').should('be.visible');
        cy.contains('MeineListe2').should('be.visible');
    });

    it('navigiert zur korrekten Liste per Klick auf einen Listeneintrag', () => {
        cy.setupAuth();
        cy.visit('/');
        cy.contains('MeineListe1').click();
        cy.url().should('match', /\/list\/[a-f0-9]+/);
        cy.contains('MeineListe1').should('be.visible');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Authentifizierung – Registrieren, Login, Logout
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Authentifizierung', () => {
    const timestamp  = Date.now();
    const testUser   = `testuser_${timestamp}`;
    const testPass   = 'Passwort123';

    it('registriert einen neuen Benutzer erfolgreich und leitet zur Startseite', () => {
        cy.visit('/register');
        cy.get('input').eq(0).type(testUser);
        cy.get('input').eq(1).type(testPass);
        cy.get('input').eq(2).type(testPass);
        cy.get('.v-card').contains('button', 'Register').click();
        cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('zeigt eine Fehlermeldung wenn Passwörter nicht übereinstimmen', () => {
        cy.visit('/register');
        cy.get('input').eq(0).type('irgendeinuser');
        cy.get('input').eq(1).type('Passwort1');
        cy.get('input').eq(2).type('Passwort2');
        cy.get('.v-card').contains('button', 'Register').click();
        cy.contains('Passwords do not match').should('be.visible');
    });

    it('zeigt eine Fehlermeldung bei bereits vorhandenem Username', () => {
        // Erst registrieren (localStorage ist pro Test isoliert)
        const dupUser = `dupuser_${Date.now()}`;
        cy.clearLocalStorage();
        cy.visit('/register');
        cy.get('input').eq(0).type(dupUser);
        cy.get('input').eq(1).type(testPass);
        cy.get('input').eq(2).type(testPass);
        cy.get('.v-card').contains('button', 'Register').click();
        cy.url().should('eq', Cypress.config().baseUrl + '/');

        // Nochmal mit demselben User registrieren → Fehler
        cy.visit('/register');
        cy.get('input').eq(0).type(dupUser);
        cy.get('input').eq(1).type(testPass);
        cy.get('input').eq(2).type(testPass);
        cy.get('.v-card').contains('button', 'Register').click();
        cy.get('.v-alert').should('be.visible');
    });

    it('loggt sich mit gültigen Zugangsdaten ein', () => {
        // Erst registrieren (localStorage ist pro Test isoliert)
        const loginUser = `loginuser_${Date.now()}`;
        cy.clearLocalStorage();
        cy.visit('/register');
        cy.get('input').eq(0).type(loginUser);
        cy.get('input').eq(1).type(testPass);
        cy.get('input').eq(2).type(testPass);
        cy.get('.v-card').contains('button', 'Register').click();
        cy.url().should('eq', Cypress.config().baseUrl + '/');

        // Logout
        cy.contains('button', 'Logout').click();

        // Login
        cy.visit('/login');
        cy.get('input').eq(0).type(loginUser);
        cy.get('input').eq(1).type(testPass);
        cy.get('.v-card').contains('button', 'Login').click();
        cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('zeigt einen Fehler bei falschem Passwort', () => {
        cy.visit('/login');
        cy.get('input').eq(0).type('nichtvorhanden');
        cy.get('input').eq(1).type('falschesPasswort');
        cy.get('.v-card').contains('button', 'Login').click();
        cy.get('.v-alert').should('be.visible');
    });

    it('zeigt den Username in der App-Bar nach dem Login', () => {
        const userForBar = `baruser_${Date.now()}`;
        cy.clearLocalStorage();
        cy.visit('/register');
        cy.get('input').eq(0).type(userForBar);
        cy.get('input').eq(1).type(testPass);
        cy.get('input').eq(2).type(testPass);
        cy.get('.v-card').contains('button', 'Register').click();
        cy.url().should('eq', Cypress.config().baseUrl + '/');

        cy.contains(userForBar).should('be.visible');
    });

    it('loggt den Benutzer aus und zeigt Login/Register-Buttons in der App-Bar', () => {
        const logoutUser = `logoutuser_${Date.now()}`;
        cy.clearLocalStorage();
        cy.visit('/register');
        cy.get('input').eq(0).type(logoutUser);
        cy.get('input').eq(1).type(testPass);
        cy.get('input').eq(2).type(testPass);
        cy.get('.v-card').contains('button', 'Register').click();
        cy.url().should('eq', Cypress.config().baseUrl + '/');

        // Logout
        cy.contains('button', 'Logout').click();
        cy.url().should('include', '/login');

        cy.visit('/login');
        cy.contains('Login').should('be.visible');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Einstellungen – Dark Mode & Cache leeren
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Einstellungen', () => {
    beforeEach(() => {
        cy.setupAuth();
        cy.visit('/settings');
    });

    it('öffnet die Einstellungsseite', () => {
        cy.contains('Einstellungen').should('be.visible');
    });

    it('zeigt den Dark-Mode-Toggle', () => {
        cy.contains('Erscheinungsbild').should('be.visible');
        cy.get('.v-switch').should('be.visible');
    });

    it('zeigt den "Cache leeren"-Button', () => {
        cy.contains('Leeren').should('be.visible');
    });

    it('zeigt einen Snackbar nach Klick auf "Leeren"', () => {
        cy.contains('Leeren').click();
        cy.contains('Cache wurde geleert').should('be.visible');
    });

    it('navigiert mit dem "Fertig"-Button zurück', () => {
        cy.contains('Fertig').click();
        // Zurück zur vorherigen Seite (history.back) – URL ändert sich
        cy.url().should('not.include', '/settings');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Story: Zeitstempel bei Änderungen
// ─────────────────────────────────────────────────────────────────────────────
describe('Story: Zeitstempel bei Artikeländerungen', () => {
    let listPath = '';

    before(() => {
        cy.setupAuth();
        createListAndGetPath('Zeitstempel-Test').then(p => { listPath = p; });
    });

    beforeEach(() => {
        cy.setupAuth();
        cy.then(() => cy.visit(listPath));
    });

    it('speichert einen hinzugefügten Artikel mit einer ID (Timestamp-basiert)', () => {
        // Die ID in listHash.ts wird per Date.now().toString() generiert
        // Wir prüfen indirekt: Der Artikel erscheint in der Liste ohne Fehler
        cy.addListItem('Zeitstempel-Artikel');
        cy.contains('td', 'Zeitstempel-Artikel').should('be.visible');
        // Kein Sync-Fehler-Icon soll erscheinen
        cy.get('.mdi-sync-alert').should('not.exist');
    });
});