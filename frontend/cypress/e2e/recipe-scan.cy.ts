describe('Rezept-Scan Import', () => {
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes("Failed to execute 'transaction' on 'IDBDatabase'")) {
      return false;
    }
    return true;
  });

  beforeEach(() => {
    cy.setupAuth();
    cy.visit('/');

    cy.contains('Geteilte Liste erstellen').click();
    cy.get('input').first().type('Rezept-Testliste', { force: true });
    cy.contains('Erstellen & Teilen').click();

    cy.url().should('match', /\/list\/[a-f0-9]+/);
  });

  it('liest Zutaten aus Rezept und uebernimmt sie in Reihenfolge in die Liste', () => {
    cy.window().then((win) => {
      (win as Window & {
        __CHECKIT_E2E_SCAN_OVERRIDE__?: {
          recipeIngredients: Array<{ name: string; menge: string; orderIndex: number }>;
        };
      }).__CHECKIT_E2E_SCAN_OVERRIDE__ = {
        recipeIngredients: [
          { name: 'Tomaten', menge: '2', orderIndex: 2 },
          { name: 'Zwiebel', menge: '1', orderIndex: 1 },
          { name: 'Olivenoel', menge: '2 EL', orderIndex: 3 },
        ],
      };
    });

    cy.contains('button', 'Scan').click();
    cy.get('[data-testid="scan-mode-recipe"]').click();

    cy.get('input[type="file"]').eq(1).selectFile(
      {
        contents: Cypress.Buffer.from('fake-image-content'),
        fileName: 'rezept.png',
        mimeType: 'image/png',
      },
      { force: true }
    );

    cy.get('[data-testid="recipe-ingredient-row"]').should('have.length', 3);
    cy.get('[data-testid="recipe-ingredient-row"] .v-list-item-title').then(($nodes) => {
      const names = [...$nodes].map((n) => n.textContent?.trim());
      expect(names).to.deep.equal(['Zwiebel', 'Tomaten', 'Olivenoel']);
    });

    cy.get('[data-testid="scan-confirm"]').click();

    cy.get('.v-data-table', { timeout: 10000 }).invoke('text').then((tableText) => {
      const idx1 = tableText.indexOf('Zwiebel');
      const idx2 = tableText.indexOf('Tomaten');
      const idx3 = tableText.indexOf('Olivenoel');
      expect(idx1).to.be.greaterThan(-1);
      expect(idx2).to.be.greaterThan(-1);
      expect(idx3).to.be.greaterThan(-1);
      expect(idx1).to.be.lessThan(idx2);
      expect(idx2).to.be.lessThan(idx3);
    });
  });
});

