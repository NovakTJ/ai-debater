#!/usr/bin/env node

import "dotenv/config";
import { runDebate } from "./debateEngine.mjs";

function printHelp() {
  console.log(`
ai-debater

Usage:
  npm run debate -- --idea "expand to seattle" [--for "arg"] [--against "arg"] [--data "text"]
  npm run debate -- --stdin

Flags:
  --idea       Required unless using --stdin
  --for        Repeatable; argument in favor
  --against    Repeatable; argument against
  --data       Optional free text for available data
  --model      Optional Anthropic model override
  --stdin      Read JSON payload from stdin
  --help       Show this help

Stdin JSON schema:
{
  "idea": "string",
  "argumentsFor": ["string"],
  "argumentsAgainst": ["string"],
  "availableData": "string"
}
`);
}

function parseArgs(argv) {
  const result = {
    argumentsFor: [],
    argumentsAgainst: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--help" || token === "-h") {
      result.help = true;
      continue;
    }

    if (token === "--stdin") {
      result.stdin = true;
      continue;
    }

    if (token === "--idea") {
      result.idea = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--for") {
      result.argumentsFor.push(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--against") {
      result.argumentsAgainst.push(argv[index + 1]);
      index += 1;
      continue;
    }

    if (token === "--data") {
      result.availableData = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--model") {
      result.model = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return result;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    printHelp();
    return;
  }

  let payload;

  if (parsed.stdin) {
    const raw = await readStdin();
    if (!raw) {
      throw new Error("--stdin was set but no JSON input was provided.");
    }
    payload = JSON.parse(raw);
  } else {
    payload = {
      idea: parsed.idea,
      argumentsFor: parsed.argumentsFor,
      argumentsAgainst: parsed.argumentsAgainst,
      availableData: parsed.availableData || ""
    };
  }

  const result = await runDebate(payload, { model: parsed.model });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
