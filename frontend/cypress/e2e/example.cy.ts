describe('App Start-Test', () => {
  it('Die App lädt erfolgreich', () => {
    cy.visit('/')
    
    cy.get('#app').should('exist')
  })
})
