# Spinel Arena

Side-by-side comparison of standard Claude vs Claude + [Spinel](https://github.com/charlesxjyang/spinel) for materials science analysis.

Upload your data, ask a question, and see the difference domain expertise makes.

## Setup

```bash
git clone https://github.com/charlesxjyang/spinel-arena
cd spinel-arena
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

### Required API keys

1. **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)
2. **E2B API key** — [e2b.dev](https://e2b.dev) (free tier: $100/month credits)
3. **Materials Project API key** — [next-gen.materialsproject.org](https://next-gen.materialsproject.org) (free)

### Optional: pre-built E2B sandbox template

For faster boot times (~1s vs ~60s), build a custom E2B template:

```bash
cd e2b
e2b template init --name spinel-sandbox --dockerfile Dockerfile.spinel
e2b template build
# Copy the template ID into .env.local as E2B_SPINEL_TEMPLATE
```

## Architecture

```
User uploads .cif file + asks "analyze this crystal structure"
                    │
                    ▼
            ┌──────────────┐
            │   Next.js    │
            │   Frontend   │
            └──────┬───────┘
                   │ fires 2 parallel requests
          ┌────────┴────────┐
          ▼                 ▼
   /api/chat?mode=     /api/chat?mode=
     vanilla              spinel
          │                 │
          ▼                 ▼
   System prompt:      System prompt:
   "You are Claude"    "You are Claude
          │             + 7 SKILL.md
          │             + tool defs"
          │                 │
          ▼                 ▼
     Anthropic API     Anthropic API
     (Sonnet 4.5)     (Sonnet 4.5)
          │                 │
          ▼                 ▼
   E2B Sandbox         E2B Sandbox
   (base Python)       (pymatgen, ase,
          │             cellpy, etc.)
          ▼                 ▼
   ┌─────────────────────────────┐
   │   Side-by-side streaming    │
   │   responses with plots      │
   └─────────────────────────────┘
```

## Stack

- **Next.js 15** + Tailwind CSS
- **Anthropic API** (Claude Sonnet 4.5)
- **E2B Code Interpreter** for sandboxed Python execution
- **Vercel** for hosting

## Cost

~$0.20/session with Sonnet, ~$2–4/session with Opus. E2B free tier covers ~1,000 sessions/month.

## License

MIT
