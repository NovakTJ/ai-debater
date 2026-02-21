# ai-debater

An anti-sycophancy scaffold that forces structured disagreement with separate API calls per agent.

The app runs a **5-call multi-agent flow** with Anthropic:

1. **Zeroth agent (evidence ledger)** builds neutral arguments **for** and **against** from available data, user inputs, and explicit **unknown unknowns**.
2. **Prompt-builder agent (FOR)** creates a neutral user-style evaluation prompt supporting the idea.
3. **Prompt-builder agent (AGAINST)** creates a neutral user-style evaluation prompt opposing the idea.
4. **Evaluator agent (FOR)** evaluates the idea from the FOR prompt.
5. **Evaluator agent (AGAINST)** evaluates the idea from the AGAINST prompt.

The user sees both generated prompts (inputs) and both evaluation outputs.

## Why this exists

LLMs often validate the user's framing. This scaffold tries to reduce that by:

- converting the idea into neutral third-person framing,
- forcing mirrored counterfactual prompts,
- carrying uncertainty as first-class data.

## Project structure

- `.claude/skills/ai-debater/SKILL.md` — Claude Code skill definition and usage prompt
- `src/index.mjs` — CLI entrypoint
- `src/debateEngine.mjs` — Anthropic orchestration and prompts
- `.env.example` — environment template

## Setup

1. Install deps:

```bash
npm install
```

2. Add your key (you said you'll paste later):

```bash
cp .env.example .env
# then set ANTHROPIC_API_KEY in .env
```

3. Run the CLI:

```bash
npm run debate -- --idea "expand to seattle" \
	--for "faster enterprise sales in pacific northwest" \
	--against "high burn and uncertain demand" \
	--data "Current ARR in region is low; hiring market is competitive."
```

Or use stdin JSON:

```bash
cat <<'JSON' | npm run debate -- --stdin
{
	"idea": "Expand operations to Seattle in Q3",
	"argumentsFor": ["Closer to target customers", "Recruiting density for AI talent"],
	"argumentsAgainst": ["Office costs", "Execution distraction"],
	"availableData": "CAC is rising 12% QoQ. Current close rate in region is 18%."
}
JSON
```

## Output

The command prints JSON with:

- `evidenceLedger` (pros/cons/unknown unknowns/assumptions/missing data)
- `debateRuns[0]` for side `for`:
	- `generatedPrompt`
	- `evaluation`
- `debateRuns[1]` for side `against`:
	- `generatedPrompt`
	- `evaluation`

## Claude Code skill usage

This repo includes `.claude/skills/ai-debater/SKILL.md`.

In Claude Code, invoke the skill and provide:

- the user's idea,
- user arguments for/against,
- any internal facts/data.

The skill instructs Claude to run this engine and return both prompt inputs and evaluation outputs.

## Notes

- Default model: `claude-3-7-sonnet-latest` (override with `ANTHROPIC_MODEL`)
- This is a scaffold, not legal/financial advice.