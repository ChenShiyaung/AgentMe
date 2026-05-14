<p align="center">
  English | <a href="./README.md">中文</a>
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/agentme-cli?color=blue&label=npm" alt="npm version" />
  <img src="https://img.shields.io/npm/l/agentme-cli" alt="license" />
  <img src="https://img.shields.io/badge/platform-Cursor%20%7C%20Claude%20%7C%20Codex%20%7C%20ChatGPT-blueviolet" alt="platforms" />
</p>

<h1 align="center">AgentMe</h1>

<p align="center">
  <strong>From carbon to silicon, you're just one init away.</strong><br/>
  Build a portable, evolving AI identity with pure documents — carry it to any AI platform.<br/>
  <sub>AgentMe — "Me" stands for both "myself" and "Memory".</sub>
</p>

---

## In a Nutshell

```bash
npx agentme-cli init
```

You've chatted with AI a thousand times, yet it still doesn't know you. Switch tools? Start over. Notes scattered across ten apps, bookmarks gathering dust.

**AgentMe fixes this.** It creates a pure Markdown profile directory on your machine — who you are, what you know, what you've built, what you're working on — then syncs your identity to your favorite AI tools in one step.

After each AI conversation, just say `/agentme-archive` (requires the platform Skill to be installed), and your knowledge gets **automatically extracted, scored, classified, and written** into your profile. Keep archiving, and AI keeps getting to know you better — with a ratchet mechanism that prevents it from getting worse.

## Why AgentMe?

| Your Pain | How AgentMe Helps |
|-----------|-------------------|
| Have to re-introduce yourself to every new AI | One profile, synced to Cursor, Claude, Codex and more |
| 1000 conversations and it's still a stranger | Every archive accumulates knowledge — your AI grows a memory |
| Bookmarks collecting dust, notes everywhere | Structured directories + auto-indexing, knowledge has a home |
| AI memory degrades over time | Ratchet mechanism prevents regression, only qualified archives get written |

## Core Features

### Your Cyber Soul, Written in Markdown

```
~/.agentme/
├── Me/           # Who you are: personality, roles, milestones
├── Knowledge/    # What you know: topic-organized knowledge base
├── Product/      # What you've built: projects, products, decisions
├── Tools/        # What you use: toolchains, scripts, preferences
├── Skills/       # What you can do: workflows, automations
├── Current/      # What you're doing: current focus, open items
├── _Index.md     # Global index, entry point to your knowledge map
└── _Evolution.md # Evolution log, every growth step is traceable
```

No databases, no proprietary formats. **Pure Markdown + YAML frontmatter** — `git push` to sync, `cat` to read, any AI tool that can access local files can consume it.

### One Profile, Every AI Knows You

`agentme init` injects your identity into major AI platforms:

| Platform | Integration | How It Works |
|----------|-------------|-------------|
| **Cursor** | SKILL + Rule | Say `archive` in chat, auto-executes |
| **Claude** | CLAUDE.md marker injection | Won't overwrite your existing content |
| **Codex / Gemini CLI / Windsurf / Copilot** | AGENTS.md (community convention) | Project-level or global injection |
| **ChatGPT** | Custom Instructions | Generates instruction text, paste and go |

### Evolving Knowledge System

> **Inspiration**: The evolution algorithm draws from [autoresearch](https://github.com/cfld/autoresearch)'s "single objective score + keep/discard ratchet" approach, and [darwin-gpt](https://github.com/weykon/darwin-skill)'s "multi-dimensional rubric + volume constraint + independent review" paradigm. AgentMe merges both into a dual-layer scoring system for continuous document evolution.

Every `/agentme-archive` runs your knowledge through two gates:

**L1 Mechanical Scoring (0-50)** — No LLM calls, millisecond-fast

| Dimension | Max | What It Checks |
|-----------|-----|----------------|
| Structural integrity | 10 | Are all 5 frontmatter fields present? |
| Volume health | 10 | Body between 10-150 lines is optimal |
| Freshness | 10 | Full score within 7 days, decays over time |
| Connectivity | 10 | Has tags? Referenced by index? Cross-links? |
| Information density | 10 | Non-empty line ratio, has headings, no redundant blanks |

**L2 Semantic Scoring (0-50)** — Independent model review, triggered on demand

Scores across redundancy, accuracy, clarity, and utility, returning an `approve / reject / revise` verdict.

**Ratchet Decision**: Compares before/after scores — delta >= +5 auto-approves, delta <= -2 auto-rejects. Gray zone goes to L2 arbitration. The ratchet mechanism prevents obvious regression, ensuring every archive is a net positive.

## Get Started in 3 Steps

### 1. Install

```bash
npm install -g agentme-cli
```

### 2. Initialize

```bash
agentme init
```

Interactive guide, done in 30 seconds:
1. Pick a location for your profile directory (default `~/.agentme/`)
2. Fill in basic identity info (name, role, tech stack)
3. Select AI platforms to sync with

Already have a profile directory? `agentme init` checks integrity and patches what's missing.

### 3. Start Using

After an AI conversation, say in the chat:

```
/agentme-archive
```

That's it. The AI will: extract knowledge → match & classify → score & gate → write to profile → update indexes → sync across platforms.

### Daily Check

```bash
agentme status     # Profile stats, platform status, health tips, evolution data
agentme validate   # Check directory structure and document format
```

## Command Reference

| Command | Description |
|---------|-------------|
| `agentme init` | First-time profile setup & platform integration; re-run to sync to new platforms |
| `agentme status` | Document count, tag cloud, health warnings, evolution stats |
| `agentme validate` | Structure validation + format check + index consistency |
| `agentme validate --fix` | Auto-fix repairable issues (index counts, timestamps, etc.) |

## Design Philosophy

> **Document as Identity**

- **Plain text first**: No databases, no platform lock-in, `git push` is your backup
- **Progressive growth**: Start from an empty directory, every conversation adds a little
- **Safe evolution**: Ratchet mechanism gates every archive through scoring
- **Open adaptation**: If an AI can read files, it can read you — Markdown is the universal format

## Contributing

Contributions welcome! New platform adapters, scoring algorithm improvements, doc fixes — all appreciated.

```bash
git clone https://github.com/ChenShiyaung/AgentMe.git
cd AgentMe
npm install
npm test
```

## License

[MIT](./LICENSE)

---

<p align="center">
  <em>Conversations fade, but you remain.</em>
</p>
