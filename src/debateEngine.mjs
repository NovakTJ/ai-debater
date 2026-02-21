import Anthropic from "@anthropic-ai/sdk";

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-latest";

function extractText(message) {
  return (message.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function sanitizeInput(input) {
  return {
    idea: String(input.idea || "").trim(),
    argumentsFor: Array.isArray(input.argumentsFor)
      ? input.argumentsFor.map((item) => String(item).trim()).filter(Boolean)
      : [],
    argumentsAgainst: Array.isArray(input.argumentsAgainst)
      ? input.argumentsAgainst.map((item) => String(item).trim()).filter(Boolean)
      : [],
    availableData: String(input.availableData || "").trim()
  };
}

const JSON_RESPONSE_INSTRUCTION =
  "Return valid JSON only. Do not wrap in markdown fences.";

async function generateEvidenceLedger(client, model, payload) {
  const prompt = `
You are the Zeroth Agent for a decision debate workflow.
Goal: create an evidence ledger that is balanced and neutral.

Rules:
- Convert the idea into neutral third-person framing.
- Include arguments for and against using available data and user-provided points.
- Include a dedicated section for unknown unknowns (default obstacle bucket).
- Distinguish facts, assumptions, and missing data.
- Avoid cheerleading language.

Input JSON:
${JSON.stringify(payload, null, 2)}

Output schema:
{
  "neutralFraming": "string",
  "argumentsFor": ["string"],
  "argumentsAgainst": ["string"],
  "unknownUnknowns": ["string"],
  "assumptions": ["string"],
  "missingData": ["string"]
}

${JSON_RESPONSE_INSTRUCTION}
`;

  const response = await client.messages.create({
    model,
    max_tokens: 1400,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  const text = extractText(response);
  return JSON.parse(text);
}

async function generateEvaluationPrompt(client, model, ledger, side) {
  const direction =
    side === "for"
      ? "Create a neutral user-style prompt that asks an evaluator to assess the idea in favor."
      : "Create a neutral user-style prompt that asks an evaluator to assess the idea against.";

  const prompt = `
You are a prompt-construction agent.
${direction}

Rules:
- Return a prompt that resembles what a regular user would submit.
- Keep tone neutral, third-person, and specific.
- Include available evidence, assumptions, and unknown unknowns.
- Include clear instructions for objective evaluation.
- Do not evaluate the idea yourself; only create the prompt text.

Evidence ledger:
${JSON.stringify(ledger, null, 2)}

Output schema:
{
  "side": "for|against",
  "audience": "string",
  "generatedPrompt": "string"
}

${JSON_RESPONSE_INSTRUCTION}
`;

  const response = await client.messages.create({
    model,
    max_tokens: 1400,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }]
  });

  const text = extractText(response);
  return JSON.parse(text);
}

async function runEvaluation(client, model, generatedPrompt, side) {
  const prompt = `
You are an evaluation agent.

You must evaluate a proposal request neutrally and in third-person.
Include uncertainty and avoid persuasive language.

Rules:
- Assess evidence quality, assumptions, downside risk, and reversibility.
- Do not claim certainty.
- Keep recommendation conditional.
- Mention unknown unknowns explicitly.

Input side: ${side}

User-style evaluation prompt:
${generatedPrompt}

Output schema:
{
  "side": "for|against",
  "recommendedDirection": "proceed|do-not-proceed|defer",
  "confidence": "low|medium|high",
  "summary": "string",
  "reasoning": ["string"],
  "keyRisks": ["string"],
  "mitigations": ["string"],
  "whatWouldChangeDecision": ["string"]
}

${JSON_RESPONSE_INSTRUCTION}
`;

  const response = await client.messages.create({
    model,
    max_tokens: 1000,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  const text = extractText(response);
  return JSON.parse(text);
}

export async function runDebate(input, options = {}) {
  const payload = sanitizeInput(input);

  if (!payload.idea) {
    throw new Error("Missing required field: idea");
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY. Add it to your environment or .env file.");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = options.model || DEFAULT_MODEL;

  const evidenceLedger = await generateEvidenceLedger(client, model, payload);
  const promptFor = await generateEvaluationPrompt(client, model, evidenceLedger, "for");
  const promptAgainst = await generateEvaluationPrompt(client, model, evidenceLedger, "against");

  const evaluationFor = await runEvaluation(
    client,
    model,
    promptFor.generatedPrompt,
    "for"
  );
  const evaluationAgainst = await runEvaluation(
    client,
    model,
    promptAgainst.generatedPrompt,
    "against"
  );

  return {
    input: payload,
    model,
    evidenceLedger,
    debateRuns: [
      {
        side: "for",
        generatedPrompt: promptFor.generatedPrompt,
        evaluation: evaluationFor
      },
      {
        side: "against",
        generatedPrompt: promptAgainst.generatedPrompt,
        evaluation: evaluationAgainst
      }
    ]
  };
}
