# AI Debater (Anti-Sycophancy)

Use this skill when a user wants balanced judgment on a proposal and wants to avoid default validation bias.

## Objective

Generate both sides in neutral third-person voice:

1. Build a zeroth-agent evidence ledger from user data and unknown unknowns.
2. Produce a neutral **for** user-style evaluation prompt.
3. Produce a neutral **against** user-style evaluation prompt.
4. Feed each generated prompt into separate evaluator agents.
5. Return both prompt inputs and both evaluator outputs.

## Required input

- Idea statement
- User arguments for
- User arguments against
- Available data/context

## Execution

If this repository is available, run:

```bash
npm run debate -- --stdin
```

with stdin JSON:

```json
{
  "idea": "...",
  "argumentsFor": ["..."],
  "argumentsAgainst": ["..."],
  "availableData": "..."
}
```

## Output contract

Return all of the following to the user:

- Evidence ledger (pros, cons, unknown unknowns, assumptions, missing data)
- Generated FOR evaluation prompt + evaluator output
- Generated AGAINST evaluation prompt + evaluator output

## Quality bar

- Avoid first-person framing.
- Avoid persuasive or hype language.
- Preserve uncertainty explicitly.
- Include unknown unknowns even when data is sparse.
