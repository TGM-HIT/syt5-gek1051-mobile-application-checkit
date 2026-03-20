/// <reference types="cypress" />

/**
 * E2E-Tests: Offline-Erkennung und Sync-Fehlermeldungen
 *
 * Getestete Funktionalität (implementiert in ListView.vue + listHash.ts):
 *  - Offline-Banner bei simuliertem und echtem Netzwerkausfall
 *  - Oranger Snackbar beim Offline-Gehen
 *  - Grüner Snackbar bei Rückkehr ins Netz
 *  - mdi-cloud-upload-outline Icon für offline hinzugefügte/geänderte Artikel
 *  - Zähler im Banner ("1 Änderung", "2 Änderungen …")
 *  - Bereinigung aller Pending-Markierungen nach Reconnect
 *  - Roter Snackbar bei CouchDB-Sync-Fehler
 *
 * Voraussetzung: App läuft unter http://localhost:8080
 *               CouchDB läuft unter http://localhost:5984
 */

describe('Offline-Erkennung und Sync-Fehlermeldungen', () => {
  // Wird in before() gesetzt und von allen Tests verwendet
  let listPath = '';

  // ─── Einmalig: Auth + Testliste anlegen ─────────────────────────────────────
  before(() => {
    cy.setupAuth();

    cy.visit('/', {
      onBeforeLoad(win) {
        // Testkonto in localStorage registrieren (wird für currentUser benötigt)
        win.localStorage.setItem(
          'checkit_accounts',
          JSON.stringify({ testuser: 'testhash' })
        );
      },
    });

    cy.contains('Einkaufsliste erstellen').click();
    cy.get('input').first().type('Offline-Testliste');
    cy.contains("Los geht's!").click();

    // Hash aus der URL extrahieren und speichern
    cy.url().should('include', '/list/').then(url => {
      listPath = new URL(url).pathname; // z. B. /list/abc123def456
    });
  });

  // ─── Vor jedem Test: zur Liste im Debug-Modus navigieren ────────────────────
  beforeEach(() => {
    cy.setupAuth();
    // cy.then stellt sicher, dass listPath bereits gesetzt ist
    cy.then(() => cy.visit(listPath + '?debug=true'));
    // Warten bis der Debug-Toggle sichtbar ist (Seite vollständig geladen)
    cy.contains('button', 'Online', { timeout: 10000 }).should('be.visible');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Gruppe 1: Simulierter Offline-Modus (Debug-Toggle)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Simulierter Offline-Modus (Debug-Toggle)', () => {
    it('zeigt den Offline-Banner wenn der Debug-Toggle auf Offline geschaltet wird', () => {
      cy.goOffline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');
    });

    it('zeigt einen orangen Snackbar beim Aktivieren des Offline-Modus', () => {
      cy.goOffline();
      cy.get('.v-snackbar')
        .should('be.visible')
        .and('contain', 'Kein Internet')
        .and('contain', 'lokal gespeichert');
    });

    it('zeigt einen grünen Snackbar beim Deaktivieren des Offline-Modus', () => {
      cy.goOffline();
      // Snackbar schließen damit der nächste Snackbar sichtbar wird
      cy.get('.v-snackbar').contains('Schließen').click();

      cy.goOnline();
      cy.get('.v-snackbar')
        .should('be.visible')
        .and('contain', 'Wieder online')
        .and('contain', 'Synchronisierung');
    });

    it('versteckt den Offline-Banner nach Rückkehr ins Netz', () => {
      cy.goOffline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');
      cy.goOnline();
      cy.get('.v-alert').contains('Du bist offline').should('not.exist');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Gruppe 2: Ausstehende Sync-Markierungen (Pending Icons)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Ausstehende Sync-Markierungen bei Offline-Änderungen', () => {
    it('markiert einen offline hinzugefügten Artikel mit dem Cloud-Upload-Icon', () => {
      cy.goOffline();
      cy.addListItem('Milch offline');
      cy.get('.mdi-cloud-upload-outline').should('be.visible');
    });

    it('zeigt im Banner "1 Änderung" nach einem offline hinzugefügten Artikel', () => {
      cy.goOffline();
      cy.addListItem('Einzelartikel offline');
      cy.get('.v-alert').contains('1 Änderung').should('be.visible');
      // Sicherstellen dass NICHT "Änderungen" (Plural) steht
      cy.get('.v-alert').contains('1 Änderung wird synchronisiert').should('be.visible');
    });

    it('zeigt im Banner "2 Änderungen" nach zwei offline hinzugefügten Artikeln', () => {
      cy.goOffline();
      cy.addListItem('Artikel offline A');
      cy.addListItem('Artikel offline B');
      cy.get('.v-alert').contains('2 Änderungen').should('be.visible');
    });

    it('aktualisiert den Banner-Zähler bei jeder weiteren Offline-Änderung', () => {
      cy.goOffline();
      cy.addListItem('Zähler-Test 1');
      cy.get('.v-alert').contains('1 Änderung').should('be.visible');

      cy.addListItem('Zähler-Test 2');
      cy.get('.v-alert').contains('2 Änderungen').should('be.visible');

      cy.addListItem('Zähler-Test 3');
      cy.get('.v-alert').contains('3 Änderungen').should('be.visible');
    });

    it('entfernt alle Cloud-Upload-Icons nach Rückkehr ins Netz', () => {
      cy.goOffline();
      cy.addListItem('Wird-synchronisiert Artikel');
      cy.get('.mdi-cloud-upload-outline').should('be.visible');

      cy.goOnline();
      cy.get('.mdi-cloud-upload-outline').should('not.exist');
    });

    it('setzt den Zähler auf null nach Rückkehr ins Netz', () => {
      cy.goOffline();
      cy.addListItem('Bereinigung Test A');
      cy.addListItem('Bereinigung Test B');
      cy.get('.v-alert').contains('2 Änderungen').should('be.visible');

      cy.goOnline();
      // Banner sollte weg sein (kein "Änderungen" mehr)
      cy.get('.v-alert').contains('Änderung').should('not.exist');
    });

    it('zeigt kein Cloud-Upload-Icon für Artikel die online hinzugefügt wurden', () => {
      // Online-Artikel hinzufügen (kein Offline-Modus)
      cy.addListItem('Online-Artikel kein Icon');
      cy.get('.mdi-cloud-upload-outline').should('not.exist');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Gruppe 3: Echter Browser-Offline via window-Events (isOffline)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Echter Netzwerkausfall über browser offline/online Events', () => {
    it('zeigt Offline-Banner bei browser offline-Event', () => {
      cy.triggerBrowserOffline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');
    });

    it('zeigt orangen Snackbar bei browser offline-Event', () => {
      cy.triggerBrowserOffline();
      cy.get('.v-snackbar')
        .should('be.visible')
        .and('contain', 'Kein Internet');
    });

    it('markiert offline hinzugefügten Artikel mit Cloud-Upload-Icon bei echtem offline-Event', () => {
      cy.triggerBrowserOffline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');
      cy.addListItem('Browser-Event Offline Artikel');
      cy.get('.mdi-cloud-upload-outline').should('be.visible');
    });

    it('versteckt den Offline-Banner nach browser online-Event', () => {
      cy.triggerBrowserOffline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');

      cy.triggerBrowserOnline();
      cy.get('.v-alert').contains('Du bist offline').should('not.exist');
    });

    it('zeigt grünen Snackbar nach browser online-Event', () => {
      cy.triggerBrowserOffline();
      cy.get('.v-snackbar').contains('Schließen').click();

      cy.triggerBrowserOnline();
      cy.get('.v-snackbar')
        .should('be.visible')
        .and('contain', 'Wieder online');
    });

    it('entfernt Cloud-Upload-Icons nach browser online-Event', () => {
      cy.triggerBrowserOffline();
      cy.addListItem('Event-Offline Bereinigung');
      cy.get('.mdi-cloud-upload-outline').should('be.visible');

      cy.triggerBrowserOnline();
      cy.get('.mdi-cloud-upload-outline').should('not.exist');
    });

    it('kombiniert Debug-Toggle und echten offline-Event korrekt', () => {
      // Erst über Debug offline schalten
      cy.goOffline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');

      // Dann noch echten offline-Event feuern → bleibt offline
      cy.triggerBrowserOffline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');

      // Online-Event feuern → noch im simulierten Offline (Debug) → bleibt offline
      cy.triggerBrowserOnline();
      cy.get('.v-alert').contains('Du bist offline').should('be.visible');

      // Debug-Toggle auf Online → jetzt wirklich online
      cy.goOnline();
      cy.get('.v-alert').contains('Du bist offline').should('not.exist');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Gruppe 4: CouchDB Sync-Fehler
  // ═══════════════════════════════════════════════════════════════════════════

  describe('CouchDB Sync-Fehlermeldungen', () => {
    it('zeigt roten Fehler-Snackbar wenn CouchDB nicht erreichbar ist', () => {
      // CouchDB-Anfragen abfangen und Netzwerkfehler simulieren
      cy.intercept({ hostname: 'localhost', port: '5984' }, { forceNetworkError: true }).as('couchdbDown');

      // Seite neu laden damit PouchDB sofort beim Start einen Sync-Fehler bekommt
      cy.then(() => cy.visit(listPath + '?debug=true'));
      cy.contains('button', 'Online', { timeout: 10000 }).should('be.visible');

      // PouchDB feuert nach dem Verbindungsfehler das error-Event → Snackbar
      cy.get('.v-snackbar', { timeout: 15000 })
        .should('be.visible')
        .and('contain', 'Synchronisation fehlgeschlagen');
    });

    it('zeigt das rote Sync-Alert-Icon im Snackbar bei CouchDB-Fehler', () => {
      cy.intercept({ hostname: 'localhost', port: '5984' }, { forceNetworkError: true }).as('couchdbDown');
      cy.then(() => cy.visit(listPath + '?debug=true'));
      cy.contains('button', 'Online', { timeout: 10000 }).should('be.visible');

      cy.get('.v-snackbar', { timeout: 15000 }).within(() => {
        cy.get('.mdi-sync-alert').should('be.visible');
      });
    });
  });
});
