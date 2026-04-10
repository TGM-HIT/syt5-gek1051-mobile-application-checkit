/// <reference types="cypress" />

/**
 * Conflict test.
 *
 * Strategy:
 * 1. Create a list and add an item (before hook).
 * 2. In the test, visit the list → fetchItems sets hasConflict=false (no conflict yet).
 * 3. Inject a sibling leaf revision via bulkDocs({new_edits:false}):
 *      - local edit  → (N+1)-<localHash>
 *      - injected    → (N+1)-ffffffff... (always wins due to higher hash)
 *    PouchDB fires a changes() event with _conflicts → hasConflict=true.
 * 4. The button must appear on the same page (no reload needed).
 * 5. Open dialog, pick a version, button disappears.
 */

describe('Konflikterkennung und -auflösung', () => {
  let listHash = '';

  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes("Failed to execute 'transaction' on 'IDBDatabase'")) return false;
    return true;
  });

  before(() => {
    // Register a fresh user so we don't depend on pre-existing state.
    // Direct cy.visit('/') with cookie can render blank in headless mode;
    // navigating FROM /register is the proven working flow.
    const user = `conflict_${Date.now()}`;
    cy.visit('/register');
    cy.get('input').eq(0).type(user, { force: true });
    cy.get('input').eq(1).type('test1234', { force: true });
    cy.get('input').eq(2).type('test1234', { force: true });
    cy.contains('button', 'Register').click();
    cy.url().should('not.include', '/register');

    cy.contains('Geteilte Liste erstellen', { timeout: 10000 }).click();
    cy.get('input').first().type('Konflikt-Liste', { force: true });
    cy.contains('Erstellen & Teilen').click();

    cy.url().should('match', /\/list\/[a-f0-9]+/).then((url) => {
      listHash = url.split('/list/')[1]!;
    });

    cy.get('input').eq(0).type('Milch');
    cy.get('.mdi-plus').closest('button').click();
    cy.contains('td', 'Milch', { timeout: 10000 }).should('be.visible');
  });

  it('zeigt Konflikt-Warnung wenn zwei Clients denselben Artikel gleichzeitig bearbeiten', () => {
    cy.setupAuth();
    cy.visit(`/list/${listHash}`);
    cy.contains('td', 'Milch', { timeout: 10000 }).should('be.visible');

    // Inject a sibling revision that wins (high hash = always lexicographic winner).
    // The changes() listener in ListView will receive the update with _conflicts populated.
    cy.window().then((win: any) => {
      const db = win.__listDb;
      expect(db, '__listDb should be exposed for Cypress').to.exist;

      return db.get(listHash, { revs: true }).then((origDoc: any) => {
        const [revNumStr, parentHash] = origDoc._rev.split('-');
        const revNum = parseInt(revNumStr);
        cy.log('origDoc._rev:', origDoc._rev);

        // Step 1: local edit → (revNum+1)-<localHash>
        return db.get(listHash).then((localDoc: any) =>
          db.put({
            ...localDoc,
            items: [
              ...(localDoc.items ?? []),
              { id: 'l1', name: 'Lokaler Artikel', menge: '3', done: false, category: 'Sonstiges' },
            ],
            savedBy: 'LocalUser',
            savedAt: new Date().toISOString(),
          })
        ).then((putResult: any) => {
          cy.log('local put rev:', putResult.rev);

          // Step 2: inject sibling at (revNum+1)-ffff... — always wins
          // Parent of BOTH: revNum-parentHash (same parent = siblings = conflict)
          const winnerHash  = 'ffffffffffffffffffffffffffffffff'; // 32 f's
          const conflictRev = `${revNum + 1}-${winnerHash}`;
          cy.log('injecting:', conflictRev);

          return db.bulkDocs(
            [{
              _id:      listHash,
              _rev:     conflictRev,
              _revisions: {
                start: revNum + 1,
                ids:   [winnerHash, parentHash],
              },
              name:    origDoc.name,
              owner:   origDoc.owner,
              items:   [{ id: 'r1', name: 'Remote Artikel', menge: '5', done: false, category: 'Sonstiges' }],
              savedBy: 'RemoteUser',
              savedAt: new Date().toISOString(),
            }],
            { new_edits: false },
          );
        }).then((bulkResult: any) => {
          cy.log('bulkDocs result:', JSON.stringify(bulkResult));
        });
      });
    });

    // Verify PouchDB recorded the conflict
    cy.window().then((win: any) => {
      return win.__listDb.get(listHash, { conflicts: true }).then((doc: any) => {
        cy.log('_conflicts after inject:', JSON.stringify(doc._conflicts));
        expect(doc._conflicts, 'PouchDB must have _conflicts after injection').to.have.length.greaterThan(0);
      });
    });

    // Force fetchItems() to re-read the doc, then flush Vue DOM update via nextTick
    cy.window().then((win: any) => {
      expect(win.__fetchItems, '__fetchItems should be exposed').to.be.a('function');
      return win.__fetchItems().then(() => win.__nextTick());
    });

    // Verify hasConflict was set to true by fetchItems
    cy.window().then((win: any) => {
      expect(win.__hasConflict?.value, 'hasConflict should be true after fetchItems').to.be.true;
    });

    // Conflict warning button must appear (data-testid added for reliable selection)
    cy.get('[data-testid="conflict-btn"]', { timeout: 10000 }).should('be.visible').click();

    // Conflict dialog opens with version selection
    cy.get('.v-dialog').should('be.visible');
    cy.contains('Synchronisierungskonflikt').should('be.visible');
    cy.contains('gleichzeitig Änderungen gemacht').should('be.visible');
    cy.contains('Diese Version wählen').should('be.visible');

    // Resolve by picking the first version
    cy.contains('Diese Version wählen').first().click();

    // Warning button gone after resolution
    cy.get('[data-testid="conflict-btn"]', { timeout: 10000 }).should('not.exist');
  });
});
