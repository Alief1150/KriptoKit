# KriptoKit Context

## Overview

KriptoKit is a dark maroon, browser-side cryptography toolkit built for a cryptography final project.

It is designed as a compact demo app with a strong editorial UI, a running ticker header, a grid-based background, and a drag-only workflow for activating operations.

## Goals

- Showcase AES encryption and decryption for text using GCM, CBC, and CFB.
- Provide Base64 encode/decode.
- Provide SHA-256 hashing for text.
- Provide ROT13 and Hex conversion tools.
- Provide file integrity verification by comparing SHA-256 hashes.
- Keep everything client-side.
- Keep the UI compact and visually polished for presentation.

## Non-Goals

- No login.
- No database.
- No backend API.
- No file upload to server.
- No multi-user collaboration.
- No complex chaining system like CyberChef.

## Stack

- Next.js 14.2.33
- React 18.3.1
- TypeScript
- Local Inter fonts from `assets/Inter/`
- node-forge for AES modes beyond native Web Crypto support
- Browser Web Crypto API

## Important Scripts

- `npm run dev` - local development
- `npm run build` - production build
- `npm run start` - run production build
- `npm run typecheck` - TypeScript check

## Runtime Requirements

- Node.js `>=20 <26`
- Recommended: Node 22 via `nvm`
- Works without extra environment variables

## Current UI Direction

- Dark background with white grid
- Maroon/red ambient glow
- Large editorial title
- Running ticker above the hero title
- Compact 3-column layout
- Left: operation list
- Center: SHA-256 verification tool
- Right: active operation workspace
- Drag-and-drop only for switching active operation

## Behavior

### Operation Activation

Users drag an operation card from the left panel into the workspace to activate it.

Clicking an operation card should not be the primary activation method.

### Verification Tool

The verification tool accepts:
- a target file
- a reference TXT file containing a SHA-256 hex string

It computes the target file hash locally and compares it with the reference hash.

### Crypto Helpers

Located in `lib/crypto.ts`.

Functions:
- AES encrypt/decrypt with GCM, CBC, and CFB
- Base64 helpers
- SHA-256 hashing
- ROT13
- Hex encode/decode

## Key Files

- `app/client-shell.tsx` - main UI and interaction logic
- `app/globals.css` - visual system and layout styling
- `app/page.tsx` - page entry
- `app/layout.tsx` - app shell metadata/layout
- `lib/crypto.ts` - browser crypto helpers
- `assets/wireframe.html` - visual reference / wireframe artifact

## Deployment Notes

For Ubuntu/Debian testing, the safest path is:

1. clone repo
2. install Node 22
3. run `npm ci`
4. run `npm run build`
5. run `npm run start`

If exposing to another machine on LAN, run dev mode with `--hostname 0.0.0.0`.

## GitHub Flow

Use this order when publishing or updating the repository:

1. Verify local health with `npm run typecheck` and `npm run build`.
2. Check `git status` to confirm only intended files changed.
3. Update docs if the workflow or setup changed.
4. Commit the change with a clear message that describes the user-facing outcome.
5. Push to GitHub on the intended branch.
6. Tell the user exactly what changed and how to run it.

## Hermes Handoff

Hermes should follow this flow when preparing the repo for GitHub:

1. Make sure the repo is self-contained.
2. Keep `README.md` aligned with the real run instructions.
3. Keep `CONTEXT.md` aligned with the current project state.
4. Do not push secrets, keys, or generated build artifacts.
5. Prefer minimal commits that keep the history easy to review.
6. Before pushing, confirm the app builds successfully on the target Node range.

## User Flow

The easiest way for another person to test the app is:

1. `git clone <repo-url>`
2. `cd <repo>`
3. `npm ci`
4. `npm run dev`

If they want production mode:

1. `npm ci`
2. `npm run build`
3. `npm run start`

## Implementation Notes

- The app is intentionally client-side.
- No secret config is required.
- Copy output actions use the Clipboard API.
- File processing stays local in the browser.
