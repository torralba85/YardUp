# YardUp — CLAUDE.md

## Project Overview

YardUp is a Next.js 15 web application. This file is the primary reference for AI assistants working in this codebase.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| Package Manager | npm |

No testing framework, linter, or CSS solution has been added yet. When the user adds one, update this file.

## Repository Structure (current)

```
YardUp/
└── package.json      # Project manifest — Next.js 15, React 19, TypeScript 5
```

The Next.js `app/` directory, `public/`, and config files (`next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, etc.) do not exist yet and will be created as the project grows. Update this section when they are added.

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run start      # Start production server
```

No test or lint scripts are defined yet. Add them here when configured.

## Next.js Conventions

- Use the **App Router** (`app/` directory), not the Pages Router.
- All pages are React Server Components by default. Add `"use client"` only when browser APIs or interactivity require it.
- Co-locate components with their routes under `app/` unless they are shared, in which case place them in `components/`.
- Use `app/layout.tsx` as the root layout; nested layouts per route segment as needed.
- API routes go in `app/api/` using Route Handler files (`route.ts`).
- Prefer Next.js `Image` and `Link` components over plain `<img>` and `<a>`.

## TypeScript Conventions

- Strict mode should be enabled in `tsconfig.json` (`"strict": true`).
- Prefer `type` aliases over `interface` for plain data shapes; use `interface` when declaration merging is needed.
- Never use `any`. Use `unknown` when the type is genuinely unknown and narrow it explicitly.
- Export types alongside their implementation files; do not create dedicated `types/` barrel files unless the project grows large enough to warrant it.

## Code Style

- No comments by default. Add a comment only when the *why* is non-obvious.
- Prefer named exports over default exports for components so refactors and imports remain consistent.
- File names: `kebab-case` for routes and utilities, `PascalCase` for React component files.
- Keep components small and focused. Extract sub-components when a single file exceeds ~150 lines.

## AI Assistant Guidelines

- **Read this file first** before making changes.
- **Update this file** whenever you add a major dependency, a new top-level directory, a build step, or a significant architectural pattern.
- Do not add features, abstractions, or error handling beyond what the task requires.
- Do not introduce linting rules, formatters, or config files unless the user explicitly asks.
- When the user asks about the project structure, refer to the "Repository Structure" section above and note that it is intentionally sparse at project inception.
- Branch for Claude-initiated work: `claude/<task-slug>`. Always open a draft PR after pushing.
