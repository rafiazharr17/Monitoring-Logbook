import assert from "node:assert/strict"; import test from "node:test"; import { verificationResultPage } from "../src/services/email.js";
test("verification page escapes message",()=>{const html=verificationResultPage("<script>alert(1)</script>",false);assert.ok(!html.includes("<script>alert(1)</script>"));assert.ok(html.includes("&lt;script&gt;"));});
