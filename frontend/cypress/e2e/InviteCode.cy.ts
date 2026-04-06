// Hilfsfunktionen
const randomUser = () => `testuser_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

/**
 * Registriert einen User mit stabilen Selektoren
 */
const registerAndNavigate = (username: string) => {
    cy.visit('/register');

    // Label-basierte Selektoren für Vuetify
    cy.contains('label', 'Username').parent().find('input').type(username);

    // Exakter Match für "Password", damit nicht "Confirm Password" getroffen wird
    cy.contains('label', /^Password$/).parent().find('input').type('Test1234!');
    cy.contains('label', 'Confirm Password').parent().find('input').type('Test1234!');

    // Wir stellen sicher, dass wir den Button klicken, nicht die h1
    cy.get('button').contains('Register').click();

    cy.url().should('eq', Cypress.config('baseUrl') + '/');
};

const createList = () => {
    cy.contains('button', 'Geteilte Liste erstellen').click();
    cy.get('input').filter(':visible').first().type('Testliste');
    cy.contains('button', 'Erstellen & Teilen').click();
    cy.url().should('include', '/list/');
};

describe('Einladungscode', () => {

    it('Share-Button öffnet den Invite-Dialog', () => {
        registerAndNavigate(randomUser());
        createList();

        cy.get('button').find('.mdi-share-variant').parent().click();
        cy.contains('Liste teilen').should('be.visible');
    });

    it('Einladungscode wird angezeigt und ist nicht leer', () => {
        registerAndNavigate(randomUser());
        createList();

        cy.get('button').find('.mdi-share-variant').parent().click();

        cy.get('.invite-code-box')
            .should('be.visible')
            .invoke('text')
            .then(text => {
                expect(text.trim()).to.have.length.greaterThan(4);
            });
    });

    it('Code kopieren zeigt Snackbar', () => {
        registerAndNavigate(randomUser());
        createList();

        cy.get('button').find('.mdi-share-variant').parent().click();

        cy.window().then(win => {
            cy.stub(win.navigator.clipboard, 'writeText').resolves();
        });

        cy.contains('button', 'Code kopieren').click();
        cy.contains('Code kopiert!').should('be.visible');
    });

    it('Ungültiger Code zeigt Fehlermeldung', () => {
        registerAndNavigate(randomUser());

        cy.get('input').filter(':visible').last().type('XXXXXX');
        cy.contains('button', 'Beitreten').click();
        cy.contains('Ungültiger oder abgelaufener Code').should('be.visible');
    });

    it('Einladungscode kann eingelöst werden', () => {
        const user1 = randomUser();
        const user2 = randomUser(); // Zweiter eindeutiger Username

        // Schritt 1: User1 erstellt die Liste
        registerAndNavigate(user1);
        createList();

        cy.get('button').find('.mdi-share-variant').parent().click();

        cy.get('.invite-code-box')
            .invoke('text')
            .then(code => {
                const trimmedCode = code.trim();

                // Schritt 2: Logout / Session löschen (wichtig bei E2E!)
                cy.clearCookies();
                cy.clearLocalStorage();

                // Schritt 3: User2 registriert sich
                registerAndNavigate(user2);

                // Schritt 4: Code einlösen
                cy.get('input').filter(':visible').last().type(trimmedCode);
                cy.contains('button', 'Beitreten').click();

                cy.url().should('include', '/list/');
                cy.contains('Testliste').should('be.visible');
            });
    });

});