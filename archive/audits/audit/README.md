# Ridendine System Audit

_Generated: 2026-04-28 · Commit: cc549db_

## How to Read This Audit

### Master Document
Start with **`SYSTEM_MAP.md`** — it is the single-file reference that stitches together every artifact in this folder. It has a clickable table of contents, inline diagrams, and links to all component cards and findings.

### Open as Obsidian Vault
Point [Obsidian](https://obsidian.md) at the `audit/` directory. All cross-references use `[[wikilinks]]` so you get a navigable knowledge graph. The graph view will show component dependencies and finding relationships.

### Directory Structure

```
audit/
├── SYSTEM_MAP.md              # Master document — start here
├── README.md                  # This file
├── audit.log                  # Timestamped action log
├── assumptions.log            # Every ⚠️ INFERRED decision
├── recommendations.md         # Prioritized backlog
│
├── raw/                       # Machine-readable inventory (JSON)
│   ├── repo-meta.json         # Languages, frameworks, workspaces
│   ├── config-keys.json       # Environment variables
│   ├── data-model.json        # Database schema (all 50+ tables)
│   ├── entry-points.json      # API routes, pages
│   ├── boundaries.json        # External integrations
│   ├── routes.json            # HTTP routes
│   ├── events.json            # Domain event pairs
│   └── duplicates.json        # Detected duplicates
│
├── components/                # One Markdown card per component
│   ├── CMP-001-engine-factory.md
│   ├── CMP-002-domain-event-emitter.md
│   └── ... (67 total)
│
├── findings/                  # One Markdown file per finding
│   ├── FND-001-duplicate-password-strength.md
│   └── ... (20 total)
│
├── flows/                     # Critical user flow documentation
│   ├── FLOW-001-order-placement.md
│   └── ... (5 total)
│
└── diagrams/
    ├── system.mmd             # Top-level system view (Mermaid)
    ├── system.dot             # Top-level system view (Graphviz)
    ├── erd.mmd                # Entity-relationship diagram
    ├── subsystems/            # Per-subsystem diagrams
    │   ├── Engine.mmd
    │   ├── WebApp.mmd
    │   ├── Database.mmd
    │   └── ...
    ├── flows/                 # Sequence diagrams
    │   ├── FLOW-001.mmd
    │   └── ...
    └── graph/
        ├── import-graph.dot   # Full import graph (Graphviz)
        └── import-graph.json  # Same graph, JSON
```

### Naming Conventions

| Prefix | Meaning | Example |
|--------|---------|---------|
| `CMP-NNN` | Component ID | `[[CMP-006]]` = OrderOrchestrator |
| `FND-NNN` | Finding ID | `[[FND-005]]` = No SLA processor |
| `FLOW-NNN` | Flow ID | `[[FLOW-001]]` = Order placement |

### Uncertainty Markers

| Marker | Meaning |
|--------|---------|
| `⚠️ INFERRED:` | Best-guess, not verified from code |
| `❓ UNKNOWN:` | Could not determine, needs follow-up |
| `🔴 BROKEN:` | Confirmed defect |
| `🟡 SMELL:` | Suspicious but not broken |
| `🟢 OK:` | Explicitly verified |

### Severity Levels (Findings)

| Severity | Meaning |
|----------|---------|
| Critical | Will cause data loss or silent failure in production |
| High | Affects correctness or security of a key workflow |
| Medium | Maintenance burden or potential future issue |
| Low | Code quality concern, no immediate risk |

### Effort Estimates

| Size | Meaning |
|------|---------|
| S | < 1 day, single file change |
| M | 1-3 days, multiple files |
| L | 1+ week, architectural change |
