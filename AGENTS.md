# Development Guide

Blogic University Next.js App Router template.

## Structure

- `src/`: App source root
- `src/hooks/`: React hooks
- `src/types/`: Types and constants
- `src/helpers/`: Utility functions
- `src/components/`: React components

## Commands

Use `npm` only. Do not use `pnpm`, `yarn`, or `bun`.

- Type check: `npm run ts`
- Format: `npm run lint` (biome.js)
- Lint: `npm run format` (biome.js)

## Code Rules

- Do not use `any`.
- Do not use classes.
- Import Zod as:

```ts
import * as z from "zod";
```

## README Rules

- Keep `README.md` in Czech.
- Write for high-school students with no prior experience.
- Use short sentences, bullets, and step-by-step instructions.
- Explain a new term immediately, or avoid it.
- Assume Windows, PowerShell, VS Code, Git, Node.js, and npm.
- Prefer practical examples over theory.
- Mention only tools and concepts students need right now.
- Use Mermaid diagrams when they explain something faster than text.
