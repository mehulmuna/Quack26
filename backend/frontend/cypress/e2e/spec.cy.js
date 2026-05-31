describe('LiftLog basic frontend testing', () => {
  it('loads login page and shows fields', () => {
    cy.visit('http://localhost:3000');
    cy.get('h1').should('contain', 'Welcome Back');
    cy.get('#username').should('be.visible');
  });
});
