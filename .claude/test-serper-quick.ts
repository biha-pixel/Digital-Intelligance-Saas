/**
 * Quick Serper API Key Test
 * Verifies your Serper API keys work before running full tests
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });

async function testSerperKeys() {
  const apiKeysStr = process.env.SERPER_API_KEYS || "";
  const apiKeys = apiKeysStr
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (apiKeys.length === 0) {
    console.error("❌ SERPER_API_KEYS not configured in .env.local");
    console.log("\nSetup:");
    console.log("1. Go to https://serper.dev and create free accounts");
    console.log("2. Copy your API keys");
    console.log("3. Add to .env.local:");
    console.log("   SERPER_API_KEYS=sk-key1,sk-key2");
    return;
  }

  console.log(`✓ Found ${apiKeys.length} Serper API key(s)\n`);

  // Test each key individually
  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    console.log(`Testing Key ${i + 1}: ${key.substring(0, 15)}...`);

    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: "test query",
          num: 1,
        }),
      });

      if (response.ok) {
        console.log(`  ✅ Key ${i + 1} works!\n`);
      } else {
        const error = await response.text();
        console.log(`  ❌ Key ${i + 1} failed: ${response.status}`);
        console.log(`     ${error}\n`);
      }
    } catch (error) {
      console.log(`  ❌ Key ${i + 1} error:`, error instanceof Error ? error.message : error);
    }
  }
}

testSerperKeys();
