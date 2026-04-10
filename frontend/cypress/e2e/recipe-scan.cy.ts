describe('Rezept-Scan Import', () => {
  const expectedIngredients = [
    'EL Mehl',
    'EL gemahlene',
    'Mandeln',
    'EL Kakaopulver',
    'Msp. Backpulver',
    'Ei',
    'EL Pflanzenöl',
    'EL Zucker',
    'EL Milch',
    'EL Schokoglasur',
  ];

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

  it('hat ein festes Testrezept und zeigt die Zutaten im Scan-Dialog an', () => {
    cy.window().then((win) => {
      (win as Window & {
        __CHECKIT_E2E_SCAN_OVERRIDE__?: {
          recipeText: string;
        };
      }).__CHECKIT_E2E_SCAN_OVERRIDE__ = {
        recipeText: 'Zutaten; EL Mehl; EL gemahlene; Mandeln; EL Kakaopulver; Msp. Backpulver; Ei; EL Pflanzenöl; EL Zucker; EL Milch; EL Schokoglasur',
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

    cy.get('[data-testid="recipe-ingredient-row"]').should('have.length', expectedIngredients.length);
    cy.get('[data-testid="recipe-ingredient-row"] .v-list-item-title').then(($nodes) => {
      const names = [...$nodes].map((n) => n.textContent?.trim());
      expect(names).to.deep.equal(expectedIngredients);
    });
  });

  it('uebernimmt genau die richtigen gescannten Zutaten in die Liste', () => {
    cy.window().then((win) => {
      (win as Window & {
        __CHECKIT_E2E_SCAN_OVERRIDE__?: {
          recipeIngredients: Array<{ name: string; menge: string; orderIndex: number }>;
        };
      }).__CHECKIT_E2E_SCAN_OVERRIDE__ = {
        // Absichtlich unsortiert, damit die Sortierung per orderIndex mitgetestet wird.
        recipeIngredients: [
          { name: 'EL Schokoglasur', menge: '1', orderIndex: 9 },
          { name: 'EL Mehl', menge: '1', orderIndex: 0 },
          { name: 'EL Milch', menge: '1', orderIndex: 8 },
          { name: 'Mandeln', menge: '1', orderIndex: 2 },
          { name: 'EL Pflanzenöl', menge: '1', orderIndex: 6 },
          { name: 'Msp. Backpulver', menge: '1', orderIndex: 4 },
          { name: 'Ei', menge: '1', orderIndex: 5 },
          { name: 'EL Kakaopulver', menge: '1', orderIndex: 3 },
          { name: 'EL Zucker', menge: '1', orderIndex: 7 },
          { name: 'EL gemahlene', menge: '1', orderIndex: 1 },
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

    cy.get('[data-testid="recipe-ingredient-row"] .v-list-item-title').then(($nodes) => {
      const names = [...$nodes].map((n) => n.textContent?.trim());
      expect(names).to.deep.equal(expectedIngredients);
    });

    cy.get('[data-testid="scan-confirm"]').click();

    cy.get('.v-data-table tbody tr', { timeout: 10000 }).then(($rows) => {
      const names = [...$rows].map((row) => {
        const cell = row.querySelector('td:nth-child(2)');
        return cell?.textContent?.trim() ?? '';
      });
      expect(names).to.deep.equal(expectedIngredients);
    });
  });
});

