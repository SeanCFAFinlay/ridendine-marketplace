import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

// DB-boundary guardrail (CLAUDE.md: "All DB access through @ridendine/db").
//
// Flags supabase-style `.from('table')` calls with a string-literal argument
// in app code, which bypass the @ridendine/db repository layer. Implemented
// as a tiny inline plugin (rather than another `no-restricted-syntax` entry)
// because that rule is already used at `error` severity for the brand
// guardrail, and this boundary check must stay a WARNING (~300 existing
// violations) so lint remains green while the migration happens.
const dbBoundaryPlugin = {
  rules: {
    'no-raw-supabase-from': {
      meta: {
        type: 'suggestion',
        docs: {
          description:
            "Disallow raw supabase `.from('table')` calls outside @ridendine/db",
        },
        schema: [],
        messages: {
          rawFrom:
            "Raw supabase `.from('…')` call bypasses the DB boundary. Route data access through a @ridendine/db repository instead.",
        },
      },
      create(context) {
        return {
          "CallExpression[callee.property.name='from'][arguments.0.type='Literal']"(
            node
          ) {
            // `Array.from(...)` (and similar static built-ins) are not DB calls.
            const callee = node.callee;
            if (
              callee.object &&
              callee.object.type === 'Identifier' &&
              ['Array', 'Buffer', 'Uint8Array', 'Int8Array', 'Float32Array', 'Float64Array'].includes(callee.object.name)
            ) {
              return;
            }
            context.report({ node, messageId: 'rawFrom' });
          },
        };
      },
    },
  },
};

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'db-boundary': dbBoundaryPlugin,
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
      // Allow `@ts-ignore` when it carries an explanatory description. Needed
      // for Next.js App Router async Server Components: `next build` type-checks
      // with generated .next/types where the usage is valid, so `@ts-expect-error`
      // would be flagged as an "unused directive" and fail the build — only
      // `@ts-ignore` works across both the standalone typecheck and next build.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-ignore': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // WARNING only — see dbBoundaryPlugin above. Must not become 'error'
      // until the existing raw `.from()` call sites are migrated.
      'db-boundary/no-raw-supabase-from': 'warn',

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
    // Test files legitimately use require() — jest's mock/re-require idiom after
    // jest.resetModules(), and dynamic requires inside test bodies. The base
    // no-require-imports rule (from tseslint recommended) doesn't fit tests.
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    ignores: ['node_modules/', '.next/', 'dist/', 'build/', '*.config.js', '*.config.ts'],
  }
);
