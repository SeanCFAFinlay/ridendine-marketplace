# rendered/

Intentionally empty.

`diagram_formats` requested SVG. Rendering Mermaid to SVG requires executing
`@mermaid-js/mermaid-cli`, which downloads and runs a headless Chromium — outside
the read-only envelope of this analysis (see `../../00-analysis-scope-and-method.md` §1).

The Mermaid sources in `../*.mmd` render natively in:

- `../../codebase-map.html` (open in any browser; also the PDF path — Ctrl+P → Save as PDF)
- GitHub, GitLab and most Markdown viewers, via the fenced blocks in documents 04, 07, 08, 16
- VS Code with the Markdown Preview Mermaid extension

To produce SVGs yourself:

```bash
pnpm dlx @mermaid-js/mermaid-cli -i diagrams/system-context.mmd -o diagrams/rendered/system-context.svg
```
