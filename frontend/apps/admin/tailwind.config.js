const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

const colorScale = (name) => ({
  50: `var(--color-${name}-50)`,
  100: `var(--color-${name}-100)`,
  200: `var(--color-${name}-200)`,
  300: `var(--color-${name}-300)`,
  400: `var(--color-${name}-400)`,
  500: `var(--color-${name}-500)`,
  600: `var(--color-${name}-600)`,
  700: `var(--color-${name}-700)`,
  800: `var(--color-${name}-800)`,
  900: `var(--color-${name}-900)`,
});

module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['var(--font-display)'],
      },
      colors: {
        brand: colorScale('brand'),
        accent: colorScale('accent'),
        neutral: colorScale('neutral'),
        success: colorScale('success'),
        warning: colorScale('warning'),
        danger: colorScale('danger'),
        info: colorScale('info'),
      },
      boxShadow: {
        rest: 'var(--shadow-rest)',
        hover: 'var(--shadow-hover)',
        active: 'var(--shadow-active)',
      },
    },
  },
  plugins: [],
};
