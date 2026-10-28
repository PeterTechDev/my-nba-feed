import assert from "node:assert/strict";
import { test } from "node:test";
import { isTolerated503 } from "./smoke-console.mjs";

const line = "Failed to load resource: the server responded with a status of 503 (Service Unavailable)";
const message = (path) => ({
  text: () => line,
  location: () => ({ url: `http://127.0.0.1:3310${path}` }),
});

test("503 tolerance is an exact path list and stays off unless the env is 1", () => {
  for (const path of ["/api/games"]) {
    assert.equal(isTolerated503(message(path), "1"), true, path);
    assert.equal(isTolerated503(message(path), ""), false, path);
  }
  assert.equal(isTolerated503(message("/api/digest/feedback"), "1"), false);
  assert.equal(isTolerated503(message("/api/digest/extra"), "1"), false);
  assert.equal(isTolerated503(message("/api/news"), "1"), false);
  assert.equal(isTolerated503({
    text: () => "Failed to load resource: the server responded with a status of 500 ()",
    location: () => ({ url: "http://127.0.0.1:3310/api/games" }),
  }, "1"), false);
});
