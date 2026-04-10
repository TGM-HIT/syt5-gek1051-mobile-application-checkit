/// <reference types="cypress" />

describe('Authentication', () => {
  const pass = 'test1234';

  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes("Failed to execute 'transaction' on 'IDBDatabase'")) return false;
    return true;
  });

  it('redirects to /login when not authenticated', () => {
    cy.visit('/');
    cy.url().should('include', '/login');
  });

  it('registers a new user and lands on home', () => {
    const user = `reg_${Date.now()}`;
    cy.visit('/register');
    cy.get('input').eq(0).type(user, { force: true });
    cy.get('input').eq(1).type(pass, { force: true });
    cy.get('input').eq(2).type(pass, { force: true });
    cy.contains('button', 'Register').click();
    cy.url().should('not.include', '/register');
    cy.url().should('not.include', '/login');
  });

  it('shows error for wrong password', () => {
    const user = `wp_${Date.now()}`;
    // Register first so the account exists in localStorage
    cy.visit('/register');
    cy.get('input').eq(0).type(user, { force: true });
    cy.get('input').eq(1).type(pass, { force: true });
    cy.get('input').eq(2).type(pass, { force: true });
    cy.contains('button', 'Register').click();
    cy.url().should('not.include', '/register');

    // Now try wrong password on the same account
    cy.clearCookie('checkit_username');
    cy.visit('/login');
    cy.get('input').eq(0).type(user, { force: true });
    cy.get('input').eq(1).type('wrongpassword', { force: true });
    cy.contains('button', 'Login').click();
    cy.contains('Wrong password.').should('be.visible');
  });

  it('logs in with correct credentials and reaches home', () => {
    const user = `login_${Date.now()}`;
    // Register first
    cy.visit('/register');
    cy.get('input').eq(0).type(user, { force: true });
    cy.get('input').eq(1).type(pass, { force: true });
    cy.get('input').eq(2).type(pass, { force: true });
    cy.contains('button', 'Register').click();
    cy.url().should('not.include', '/register');

    // Login with correct credentials
    cy.clearCookie('checkit_username');
    cy.visit('/login');
    cy.get('input').eq(0).type(user, { force: true });
    cy.get('input').eq(1).type(pass, { force: true });
    cy.contains('button', 'Login').click();
    cy.url().should('not.include', '/login');
    cy.contains('Geteilte Liste erstellen').should('be.visible');
  });
});
