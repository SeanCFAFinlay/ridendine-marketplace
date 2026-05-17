import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // ~440 existing `any` usages across the monorepo, mostly Supabase
      // client casts where the generated types don't match runtime semantics.
      // Disabled for now; tracked as a dedicated typing-debt cleanup in
      // docs/TYPING_BACKLOG.md. Re-enable when working through that backlog.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Brand guardrail (design-system migration, Phase 9).
      //
      // Bans inline Tailwind palette colors and brand hex codes in JSX/TSX
      // string literals so the codebase keeps using the canonical tokens from
      // @ridendine/ui. Without this rule, the kind of #E85D26 / #1a7a6e /
      // bg-gray-* drift that Phase 6-8 had to mass-rewrite would reappear.
      //
      // What's banned:
      //   - bg-/text-/border-/divide-/ring-/outline-/from-/to-/via-/accent-
      //     <palette>-<shade> where palette ∈ {slate,gray,zinc,neutral,stone,
      //     red,orange,amber,yellow,lime,green,emerald,teal,cyan,sky,blue,
      //     indigo,violet,purple,fuchsia,pink,rose}
      //   - Arbitrary-value classes pinning the brand orange / legacy teal
      //     hex (#E85D26 / #1a7a6e / #d44e1e / #FF6B6B / #1a9e8e)
      //
      // What's allowed:
      //   - Token classes: bg-primary, text-textMuted, border-divider,
      //     bg-successSoft, etc.
      //   - Tailwind structural utilities that aren't color (flex, p-4, etc.)
      //   - Brand hex literals inside packages/ui/src/tokens.ts (the source
      //     of truth) — covered by the file-scope override below.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Literal[value=/\\b(?:bg|text|border|divide|ring|outline|from|to|via|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]",
          message:
            'Use a brand token (bg-primary, text-textMuted, border-divider, etc.) instead of a raw Tailwind palette color. See packages/ui/src/tokens.ts.',
        },
        {
          selector:
            "TemplateElement[value.raw=/\\b(?:bg|text|border|divide|ring|outline|from|to|via|accent)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]",
          message:
            'Use a brand token (bg-primary, text-textMuted, border-divider, etc.) instead of a raw Tailwind palette color. See packages/ui/src/tokens.ts.',
        },
        {
          // Bans the legacy off-brand hex values that Phases 6-8 had to
          // mass-rewrite. The canonical token hex values (#EA5B26 primary,
          // #0E8A8A accent, #FEF8F3 background, etc.) are NOT banned — those
          // are defined once in packages/ui/src/tokens.ts and are allowed
          // anywhere a runtime hex is unavoidable (Stripe Elements appearance,
          // Leaflet polyline color, etc.).
          selector:
            "Literal[value=/#(?:E85D26|d44e1e|1a7a6e|1a9e8e|FF6B6B|FF5252|FAFAFA|2D3436|5F6368|E8E8E8|FFF8F0)\\b/i]",
          message:
            'Legacy brand hex literal is banned. Use a Tailwind token class (bg-primary, text-primary, etc.) or the canonical hex from @ridendine/ui/tokens (#EA5B26 primary, #0E8A8A accent, #FEF8F3 background) if a runtime literal is unavoidable.',
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // The token file is the canonical source of brand hex values. Disable the
    // palette/hex guardrail there so it can legitimately contain literals.
    files: ['**/packages/ui/src/tokens.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    ignores: ['node_modules/', '.next/', 'dist/', 'build/', '*.config.js', '*.config.ts'],
  }
);
