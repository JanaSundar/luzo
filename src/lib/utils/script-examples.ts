export const PRE_REQUEST_EXAMPLES = `// Example: set a variable
pm.env.set("token", "abc123");

// Modify request
pm.request.headers.upsert("X-Custom", "value");`;

export const TEST_EXAMPLES = `// Example: status check
pm.test("Status is 200", function() {
  pm.expect(pm.response.status).to.equal(200);
});

// Example: JSON body
pm.test("Response has success", function() {
  const json = pm.response.json();
  pm.expect(json).to.have.property("success");
});`;
