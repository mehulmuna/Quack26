
describe('LiftLog Login Resilience Testing', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('attempts to log in and observes outcome', () => {
    cy.get('#username').type('testuser');
    cy.get('#password').type('password');
    cy.get('.login-btn').click();
    
    // It should either show login success or failure
    cy.get('body').then(($body) => {
      if ($body.find('.error-message').length > 0) {
        cy.get('.error-message').invoke('text').then((text) => {
          cy.log('Result message:', text);
        });
      } else {
        cy.log('No error message visible. Possibly redirected or logged in.');
      }
    });
  });
});
