import fs from 'fs';

const isTailwindRepo = fs.existsSync('./tailwind.config.js');

export default {
  rules: [
    // --- Styling Rules ---
    {
      match: '*.tsx',
      rules: [
        'no-inline-styles',
        ...(isTailwindRepo
          ? ['prefer-tailwind-over-styled-components']
          : ['no-styled-components-overuse']),
        'prefer-elmo-components-over-html-tags',
      ],
    },

    // --- Code Clarity & Clean Structure ---
    {
      match: '*.tsx',
      rules: [
        'no-comments',
        'never-leave-comments',
        'prefer-readable-names',
        'no-abbreviations',
        'no-complex-nesting',
        { rule: 'function-size-limit', maxLines: 40 },
      ],
    },

    // --- React/State Management Best Practices ---
    {
      match: '*.tsx',
      rules: [
        'split-hooks-from-render',
        'prefer-useMemo-and-useCallback-for-heavy-calculations',
        'avoid-logic-in-JSX',
        'no-anonymous-default-export',
        'no-effect-without-deps',
        'avoid-setState-in-conditionals',
      ],
    },

    // --- Zustand & React Query Patterns ---
    {
      match: 'src/store/**/*.ts',
      rules: [
        'avoid-unnamed-zustand-slices',
        'split-ui-state-from-domain-state',
      ],
    },
    {
      match: 'src/hooks/**/*.ts',
      rules: [
        'prefer-react-query-for-async-state',
        'avoid-mixed-fetching-logic',
      ],
    },

    // --- Testing Rules ---
    {
      match: '*.{test.ts,test.tsx}',
      rules: [
        'test-name-must-be-descriptive',
        'no-hardcoded-wait',
        'no-mocks-inside-tests',
      ],
    },

    // --- File/Naming Hygiene ---
    {
      match: '*',
      rules: [
        'file-name-must-match-component',
        'use-kebab-case-for-folders',
        { rule: 'max-folder-depth', maxDepth: 3 },
      ],
    },
  ],
};
