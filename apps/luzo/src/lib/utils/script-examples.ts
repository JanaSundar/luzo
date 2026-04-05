export const PRE_REQUEST_EXAMPLES = `// Example: set a variable
lz.env.set("token", "abc123");

// Modify request
lz.request.headers.upsert("X-Custom", "value");`;

export const TEST_EXAMPLES = `// Example: status check
lz.test("Status is 200", function() {
  lz.expect(lz.response.status).to.equal(200);
});

// Example: JSON body
lz.test("Response has success", function() {
  const json = lz.response.json();
  lz.expect(json).to.have.property("success");
});`;
