import test from "node:test";
import assert from "node:assert/strict";
import { NeedleConfigSchema } from "../../src/config/schema.js";

test("router model profile defaults to empty", () => {
  const config = NeedleConfigSchema.parse({});
  assert.equal(config.models.router, "");
});
