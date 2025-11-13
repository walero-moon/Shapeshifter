# Shapeshift

**Shapeshift** is a modern Discord bot that lets a single user speak as different **forms** (name + avatar). Users define **aliases** (triggers containing the literal word `text`, e.g., `neoli:text` or `{text}`) and Shapeshift proxies messages via **webhooks**, rendering them as that form. The bot supports slash commands and context menus, tag-based proxying, safe mention behavior, editing/deleting proxied messages, and a reply-style display when responding to another message.

- **Scope model:** global per user (no `/system` UI).
- **Why:** clearer UX than legacy bots, robust edit/delete support, and a future **web dashboard** sharing the same use-cases (Discord-agnostic core).

Plural communities and role-players can both use Shapeshift; we deliberately keep the language neutral ("form") rather than role-play specific.

> Inspiration: PluralKit/Tupperbox invented the "`text` placeholder" convention for aliases; we adopt that because users already know it. [Tupperbox](https://tupperbox.app/guide/basics?utm_source=chatgpt.com)

---

## Key capabilities

- **Forms (identity)** — create/edit/delete forms (name + avatar).
- **Aliases** — add/list/remove triggers that **must include** the literal word `text`. Examples: `neoli:text` (prefix) or `{text}` (pattern). [Tupperbox](https://tupperbox.app/guide/basics?utm_source=chatgpt.com)
- **Proxy** — send as a form via:
  - **Tag-based** messages (e.g., `neoli: hello world`).
  - **Slash** (`/send`) or message **context menu** ("Proxy as…").
- **Message operations** — **edit** and **delete** proxied messages by storing webhook id/token/message id and using the official **Edit Webhook Message** API. [Discord Documentation](https://discord.mintlify.app/developers/docs/resources/webhook?utm_source=chatgpt.com)
- **Reply-style** — simulate a reply header + quote (webhooks can't create true replies) with an optional "Jump" link. [Discord Documentation](https://discord.mintlify.app/developers/docs/resources/webhook?utm_source=chatgpt.com)
- **Safety** — strict **Allowed Mentions** (no pings by default), channel permission checks, length limits, etc. [discord.js +1](https://discord.js.org/docs/packages/discord-api-types/main/v10/AllowedMentionsTypes%3AEnum?utm_source=chatgpt.com)

---

## Architecture (hybrid Vertical Slices + Ports & Adapters)

We combine **Vertical Slice Architecture** (feature-centric code that changes together) with **Ports & Adapters** (frameworks and I/O at the edge). This keeps the core Discord-agnostic and future-proof for a web dashboard.

```graphql
src/
  features/
    identity/                 # Forms + Aliases (one aggregate/module)
      app/                    # use-cases (Discord-agnostic)
      infra/                  # Drizzle repositories for this module
      discord/                # command handlers (form/alias UI)
    proxy/                    # Proxy pipeline & message operations
      app/                    # matcher, send/edit/delete, reply-style presenter
      infra/                  # proxied_messages repo
      discord/                # listener + context menus + /send
  shared/
    ports/
      ChannelProxyPort.ts     # { send, edit, delete }
    db/
      client.ts
      schema.ts
    utils/
      allowedMentions.ts, username.ts, ...
  adapters/
    discord/
      client.ts               # boot, intents, login
      registry.ts             # mounts commands/handlers exported by features
      register-commands.ts    # guild/global deploy script
      DiscordChannelProxy.ts  # ChannelProxyPort implemented via webhooks
```

**Why this layout**

- **Slices** keep business logic, tests, and persistence close → fast PRs and low merge friction.
- **Adapters** centralize Discord plumbing (ack timing, rate limits, error mapping) and make it easy to add a **web/HTTP adapter** later with the same use-cases.

---

## Data model (PostgreSQL + Drizzle ORM)

We use **UUIDv7** for our IDs. Version 7 UUIDs are **time-ordered**, which reduces index fragmentation and improves cache locality compared to random v4 UUIDs. PostgreSQL 18+ ships a native `uuidv7()`; for 13–17, use an extension like `pg_uuidv7` or generate in the app. [PostgreSQL +2](https://www.postgresql.org/docs/current/release-18.html?utm_source=chatgpt.com)

Tables (initial set):

- `forms(id uuidv7 pk, user_id text, name text, avatar_url text, created_at timestamptz default now())`
- `aliases(id uuidv7 pk, user_id text, form_id uuid fk, trigger_raw text, trigger_norm text, kind text, created_at timestamptz default now(), unique(user_id, trigger_norm))`
- `proxied_messages(id uuidv7 pk, user_id text, form_id uuid nullable fk, guild_id text, channel_id text, webhook_id text, webhook_token text, message_id text, created_at timestamptz default now())`

**Notes:**

- **UUIDv7**: prefer DB-generated `uuidv7()` (PG 18+) or extension `uuid_generate_v7()` (pg_uuidv7). App-side generation is a fallback. [PostgreSQL +1](https://www.postgresql.org/docs/current/release-18.html?utm_source=chatgpt.com)
- **Uniqueness**: `(user_id, trigger_norm)` prevents two aliases that would match the same text for a given user.
- **Cascades**: deleting a form cascades its aliases; `proxied_messages.form_id` can be `NULL` to preserve history.

**Drizzle ORM**  
We use Drizzle's Postgres driver and `drizzle-kit` for migrations (`generate`/`migrate`) with schema co-located in code. [Drizzle ORM +1](https://orm.drizzle.team/docs/get-started/postgresql-new?utm_source=chatgpt.com)

---

## Discord rules we **must** follow

- **Interaction timing** — your bot must send the initial response **within ~3 seconds** (or call `deferReply()`); otherwise the token is invalid. Tokens remain valid for followups for ~15 minutes. [Discord Documentation](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)
- **Components capacity** — message UI may contain **up to 5 action rows**; each row can hold **up to 5 buttons** **or** a single select menu. Use pagination. [Discord.js Guide](https://discordjs.guide/legacy/interactive-components/action-rows?utm_source=chatgpt.com)
- **Application commands scope** — **guild-scoped** commands are near-instant; **global** commands can take **up to ~1 hour** to propagate → develop on guild scope. [docs.discord4j.com](https://docs.discord4j.com/interactions/application-commands?utm_source=chatgpt.com)
- **Webhooks** — can **send/edit/delete** their own messages via the webhook token; no true replies (simulate reply UI). [Discord Documentation](https://discord.mintlify.app/developers/docs/resources/webhook?utm_source=chatgpt.com)
- **Allowed Mentions** — always set; default to no pings (`@everyone/@here`, roles, users) unless explicitly intended. [discord.js +1](https://discord.js.org/docs/packages/discord-api-types/main/v10/AllowedMentionsTypes%3AEnum?utm_source=chatgpt.com)

---

## File structure (top-level)

```bash
.
├─ docker-compose.yml                 # Postgres 16-alpine (healthcheck + volume)
├─ drizzle.config.ts                  # Drizzle config (loads .env)
├─ drizzle/                           # SQL migrations (generated)
├─ .env.example                       # BOT_TOKEN, APP_ID, DEV_GUILD_ID, DATABASE_URL, etc.
├─ src/
│  ├─ index.ts
│  ├─ config/env.ts                   # zod-validated env
│  ├─ shared/
│  │  ├─ db/{client.ts,schema.ts}
│  │  ├─ ports/ChannelProxyPort.ts
│  │  └─ utils/{allowedMentions.ts, ...}
│  ├─ adapters/discord/{client.ts,registry.ts,register-commands.ts,DiscordChannelProxy.ts}
│  └─ features/
│     ├─ identity/{app,infra,discord}
│     └─ proxy/{app,infra,discord}
└─ dist/                              # build output (root-level, gitignored)
```

---

## Development

**Prereqs**

- Node 22+, pnpm/npm, Docker Desktop (or compatible runtime).

**Quickstart**

```bash
# 1) start the DB
docker compose up -d db

# 2) generate + apply migrations
pnpm db:generate && pnpm db:migrate

# 3) register commands to a dev guild (fast)
pnpm deploy:guild

# 4) run the bot
pnpm dev
```

**Command deployment**  
Use **guild** scope for development; switch to **global** in production (propagation may take up to ~1 hour). [docs.discord4j.com](https://docs.discord4j.com/interactions/application-commands?utm_source=chatgpt.com)

**Quality bar (every PR)**

1. `pnpm build` → **green**
2. `pnpm lint` → **no errors** (warnings addressed)
3. **TypeScript** → no IDE highlights
4. Bot runs; interactions **ack in ~3s** (defer if needed) [Discord Documentation](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)
5. If you changed behavior: unit tests **or** a documented local run proving the flow
6. **Discord safety**
   - Set **Allowed Mentions** appropriately (default none). [Discord Documentation](https://discord.mintlify.app/developers/docs/resources/channel?utm_source=chatgpt.com)
   - Respect component limits; prefer paginated lists over overflowing rows. [Discord Documentation](https://discord.mintlify.app/developers/docs/components/reference?utm_source=chatgpt.com)
7. **DB migrations**
   - Update Drizzle schema+migration when data shapes change; run `generate` + `migrate` locally without errors. [Drizzle ORM](https://orm.drizzle.team/docs/get-started/postgresql-new?utm_source=chatgpt.com)

---

## Features & sequence

1. **Bootstrap & DB wiring** — Dockerized Postgres, Drizzle, `/ping`, guild deploy
2. **Identity core** — schema + use-cases: forms & aliases (Discord-agnostic)
3. **Identity Discord bindings** — slash commands + modals + paginated list
4. **Alias commands** — add/list/remove with validation & normalization
5. **Proxy core** — matcher + `/send` + tag listener + safety
6. **Message ops** — context menus (proxy as / edit / delete / who)
7. **Reply-style** — header + 1-line quote + optional Jump link
8. **Autoproxy/hold** — sticky form until cleared (optional later)
9. **Config & logging** — server toggles, audit log channel
10. **Hardening & perf** — LRU webhook cache, rate-limit logs, fallbacks

---

## Detailed PR roadmap

Below are **small, testable, ~300–400 LOC** PRs with goals, "why now," deliverables, and acceptance.

### PR #1 — Bootstrap repo + Dockerized Postgres + Discord wiring ✅

**Goal**  
Runnable skeleton with: Postgres (Compose), Drizzle wiring, Discord client, a minimal `/ping`, and a deploy script for **guild** commands (global takes longer to propagate). [docs.discord4j.com](https://docs.discord4j.com/interactions/application-commands?utm_source=chatgpt.com)

**Why now**  
Unblocks all later work; establishes scripts, env, and interaction ack patterns (≤ ~3s). [Discord Documentation](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)

**Deliverables**

- `docker-compose.yml` (Postgres 16-alpine, healthcheck via `pg_isready`, named volume).
- `drizzle.config.ts` that **loads `.env`** so `drizzle-kit` has credentials. [Drizzle ORM](https://orm.drizzle.team/docs/migrations?utm_source=chatgpt.com)
- `src/adapters/discord/{client.ts,registry.ts,register-commands.ts}`
- `/ping` (ephemeral).
- Scripts: `db:generate`, `db:migrate`, `deploy:guild`, `deploy:global`, `dev`, `build`.

**Acceptance**

- DB **healthy**; migrations commands run.
- `/ping` responds **ephemerally** and **within ~3s** (or defers). [Discord Documentation](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)
- Guild deploy is near-instant; global deploy note documented (up to ~1h). [docs.discord4j.com](https://docs.discord4j.com/interactions/application-commands?utm_source=chatgpt.com)

---

### PR #2 — Database schema + Identity core (Forms & Aliases) ✅

**Goal**  
Introduce Postgres schema (UUIDv7) and Identity use-cases (Discord-agnostic): forms + aliases.

**Why now**  
We want stable tables and business rules before wiring UI; aliases are core to proxying.

**Deliverables**

- **Tables**: `forms`, `aliases`, `proxied_messages` with constraints from **Data model** above.
  - **UUIDv7** default: `uuidv7()` on PG 18+, `uuid_generate_v7()` via `pg_uuidv7` on 13–17; fallback: app-side generation. [PostgreSQL +1](https://www.postgresql.org/docs/current/release-18.html?utm_source=chatgpt.com)
- **Identity app layer**: `CreateForm`, `EditForm`, `DeleteForm`, `ListForms`, `AddAlias`, `ListAliases`, `RemoveAlias`, `normalizeAlias`.
- **Repos (Drizzle)**: `FormRepo`, `AliasRepo`.

**Rules**

- Creating a form **auto-adds** two default aliases: `"<name>:"` and **first-letter** `"<n>:"` (skip if collision).
- **Alias must include** the literal word `text`; we normalize to `trigger_norm` (lowercase, trim, collapse spaces) and classify kind (`prefix`/`pattern`). This matches user expectations from Tupperbox/PluralKit. [Tupperbox](https://tupperbox.app/guide/basics?utm_source=chatgpt.com)
- Uniqueness: `(user_id, trigger_norm)`.

**Acceptance**

- Migrations run; UUIDv7 default works (function or extension).
- Unit tests: normalization/validation/collision; FK cascade on form delete; uniqueness enforced.

---

### PR #3 — Identity Discord bindings (slash + modals + pagination)

**Goal**  
Expose Identity via Discord: `/form add|edit|delete|list` with modals for edits and paginated lists.

**Why now**  
Prove end-to-end: feature slice calls app layer; registry mounts handlers.

**Deliverables**

- `/form add <name> [avatar_url]` → calls `CreateForm` (auto-default aliases created).
- `/form edit <form>` → opens **modal** (name + avatar); on submit → `EditForm`. (Modals must open in response to interactions.) [Discord.js Guide](https://discordjs.guide/legacy/interactive-components/interactions?utm_source=chatgpt.com)
- `/form delete <form>` → `DeleteForm` (no soft delete).
- `/form list` → **ephemeral**, **paginated** (respect component limits). [Discord.js Guide](https://discordjs.guide/legacy/interactive-components/action-rows?utm_source=chatgpt.com)

**Acceptance**

- All interactions ack within ~3s (defer as needed). [Discord Documentation](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)
- Pagination controls never exceed **5 rows** and **5 buttons/row**. [Discord.js Guide](https://discordjs.guide/legacy/interactive-components/action-rows?utm_source=chatgpt.com)

---

### PR #4 — Alias commands (validation, normalization, collisions)

**Goal**  
Implement `/alias add|list|remove` with the `text` rule and normalized uniqueness.

**Why now**  
Unblocks the tag matcher and `/send`.

**Deliverables**

- `/alias add <form> <trigger>` → validate it **contains** `text`; normalize; set `kind`.
- `/alias list <form>` → paginated (ephemeral).
- `/alias remove <id>` → delete by alias id.

**Acceptance**

- Duplicate `(user_id, trigger_norm)` rejected with helpful error.
- Tests for normalization, kind detection, duplicate rejection.

---

### PR #5 — Proxy core (matcher + /send + tag listener + safety)

**Goal**  
Make messages actually proxy as forms, both via tags and `/send`.

**Why now**  
This is the user-visible "it works" moment.

**Deliverables**

- **Matcher** builds a per-user alias index; **longest-prefix wins**; pattern aliases support bracket styles with the literal `text`.
- `/send <form> <text> [files…]` → proxies immediately.
- **Tag listener**: watch messages; if they match a user’s alias, proxy; obey content & embeds limits; delete original if configured.
- **Safety**: always set **Allowed Mentions** (no pings by default); check channel perms and message length. [discord.js +1](https://discord.js.org/docs/packages/discord-api-types/main/v10/AllowedMentionsTypes%3AEnum?utm_source=chatgpt.com)

**Acceptance**

- Messages like `neoli: hello` proxy with correct name/avatar.
- `/send` works anywhere the user can speak; ack within ~3s. [Discord Documentation](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)

---

### PR #6 — Webhook registry & message operations (edit/delete/who)

**Goal**  
Allow **edits**, **deletes**, and "who sent this" using stored webhook id/token/message id.

**Why now**  
Differentiator vs legacy bots; completes lifecycle management.

**Deliverables**

- **Webhook registry** (per channel) with per-message overrides for `username`/`avatar_url` (we **don't** PATCH the webhook identity).
- On send, store `webhook_id`, `webhook_token`, `message_id` in `proxied_messages`.
- Context menus:
  - **Edit proxied…** → modal → **Edit Webhook Message**; fallback to bot edit if token missing. [Discord Documentation](https://discord.mintlify.app/developers/docs/resources/webhook?utm_source=chatgpt.com)
  - **Delete proxied…** → delete via webhook token (or bot fallback).
  - **Who sent this?** → ephemeral info for mods.

**Acceptance**

- Edit/delete work for proxied messages; failures are handled with clear copy.

---

### PR #7 — Reply-style presentation

**Goal**  
Simulate a reply header + quote preview + "Jump" link for proxied replies.

**Why now**  
Improves readability; webhooks cannot create true replies.

**Deliverables**

- Header: `-# ↩︎ Replying to @user` (no pings), a one-line quote, and an optional **Jump** link button.
- Ensure **Allowed Mentions** block pings in the header. [discord.js](https://discord.js.org/docs/packages/discord-api-types/main/v10/AllowedMentionsTypes%3AEnum?utm_source=chatgpt.com)

**Acceptance**

- Reply-style rendering is consistent; no unwanted mentions.

---

### PR #8 — Autoproxy / hold (optional)

**Goal**  
Sticky form use until cleared (`/hold on|off` or `/form hold|clear`), plus `status`.

**Deliverables**

- Tiny user-state table for current form + "hold" flag.
- Escape: backslash (`\`) bypass once.

**Acceptance**

- After enabling hold, subsequent messages proxy with the same form until cleared.

---

### PR #9 — Config & logging

**Goal**  
Add per-guild config and audit logging.

**Deliverables**

- `/config` — set log channel, toggle tag-proxy, toggle delete-original.
- Emit send/edit/delete logs as embeds to the configured channel.
- **Allowed Mentions** in logs set to none. [discord.js](https://discord.js.org/docs/packages/discord-api-types/main/v10/AllowedMentionsTypes%3AEnum?utm_source=chatgpt.com)

**Acceptance**

- Settings persist and take effect immediately.

---

### PR #10 — Hardening & performance

**Goal**  
Lower latency and improve resiliency.

**Deliverables**

- LRU cache for webhooks by channel; invalidate on 403/404.
- Structured logging around rate limits + Discord REST route info.
- Dead-letter path for webhook edits (missing token → bot edit attempt).

**Acceptance**

- Observably fewer webhook lookups; errors captured with stable fields (`guildId`, `channelId`, etc.).

---

## Implementation notes

- **UUIDv7**: Prefer DB-side generation (`uuidv7()` on PG 18+; extension `uuid_generate_v7()` on 13–17; app-side only if the function isn't available). [PostgreSQL +1](https://www.postgresql.org/docs/current/release-18.html?utm_source=chatgpt.com)
- **Interactions**: Always reply or **defer within ~3s**; after deferring, you have ~15 minutes for follow-ups. [Discord Documentation](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)
- **Components**: Message UI is capped at **5 action rows**; each row holds **≤5 buttons** **or** **1 select**; paginate long lists. [Discord.js Guide](https://discordjs.guide/legacy/interactive-components/action-rows?utm_source=chatgpt.com)
- **Command deploy**: Develop on **guild** scope; **global** may take **up to ~1 hour** to propagate. [docs.discord4j.com](https://docs.discord4j.com/interactions/application-commands?utm_source=chatgpt.com)
- **Webhooks**: Use **Edit Webhook Message** for edits; store `webhook_id`, `webhook_token`, `message_id`. No true replies — render reply-style. [Discord Documentation](https://discord.mintlify.app/developers/docs/resources/webhook?utm_source=chatgpt.com)
- **Allowed Mentions**: Always set allowed mentions explicitly to avoid accidental pings. [discord.js](https://discord.js.org/docs/packages/discord-api-types/main/v10/AllowedMentionsTypes%3AEnum?utm_source=chatgpt.com)
- **Drizzle**: Use `drizzle-kit generate`/`migrate`, and load `.env` in `drizzle.config.ts` so the CLI sees `DATABASE_URL`. [Drizzle ORM](https://orm.drizzle.team/docs/get-started/postgresql-new?utm_source=chatgpt.com)

---

## Contributing & quality gate

1. Keep PRs **small** (≤ ~400 LOC).
2. Follow the folder layout (slices + adapters) and keep business logic Discord-agnostic.
3. **Quality** (mandatory): `build` + `lint` + typecheck clean, bot runs, and any changed flows are proven (unit test or documented local run).
4. Respect **Discord rules** (3-second ack, component limits, guild vs global behavior) and **safety** (Allowed Mentions off by default). [discord.js +3](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)
5. **Never do**:
   - Change public command names/params or persisted data shapes without an explicit ticket.
   - Commit secrets; always use `.env`/Docker secrets.
   - Send messages without setting **Allowed Mentions** explicitly. [Discord Documentation](https://discord.mintlify.app/developers/docs/resources/channel?utm_source=chatgpt.com)

---

## References

- **Interactions response timing** (3-second initial response; tokens ~15 minutes). [Discord Documentation](https://discord.mintlify.app/developers/docs/interactions/receiving-and-responding?utm_source=chatgpt.com)
- **Components capacity** (action rows + buttons/selects). [Discord.js Guide](https://discordjs.guide/legacy/interactive-components/action-rows?utm_source=chatgpt.com)
- **Webhooks edit/delete** (Edit Webhook Message API). [Discord Documentation](https://discord.mintlify.app/developers/docs/resources/webhook?utm_source=chatgpt.com)
- **Allowed Mentions** (suppress pings). [discord.js](https://discord.js.org/docs/packages/discord-api-types/main/v10/AllowedMentionsTypes%3AEnum?utm_source=chatgpt.com)
- **Application command scopes & propagation** (guild vs global; ~1h TTL for global). [docs.discord4j.com](https://docs.discord4j.com/interactions/application-commands?utm_source=chatgpt.com)
- **Drizzle ORM Postgres** (get started; migrations). [Drizzle ORM](https://orm.drizzle.team/docs/get-started/postgresql-new?utm_source=chatgpt.com)
- **UUIDv7 in Postgres** (native in PG 18; extension for 13–17; benefits). [PostgreSQL +2](https://www.postgresql.org/docs/current/release-18.html?utm_source=chatgpt.com)
- **Tupperbox "text" placeholder** (alias convention we adopt). [Tupperbox](https://tupperbox.app/guide/basics?utm_source=chatgpt.com)

---

If you want, I can also generate a **CONTRIBUTING.md** with copy-paste setup + commit/PR templates and a **pull request checklist** tailored to these rules.