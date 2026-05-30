describe("Cypress example setup", () => {
  it("can visit a frontend page", () => {
    cy.visit("/");
    cy.contains("").should("exist");
  });
});
