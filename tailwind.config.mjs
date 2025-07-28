/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin'; // Importante: importar o helper de plugin

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx,vue}'],
  
  darkMode: 'class', 

  theme: {
    extend: {
      // As tuas cores customizadas continuam aqui
      colors: {
        'primary': '#ec742c',
        'secondary': '#fa903a',
        'brand-dark': '#080027',
      }
    },
  },
  
  plugins: [
    require('@tailwindcss/typography'),
    
    // AQUI ESTÁ A MAGIA:
    // Isto ensina o Tailwind a entender "scrolled:"
    // Ele vai aplicar as classes `scrolled:*` quando o elemento tiver a classe `.scrolled`
    plugin(function({ addVariant }) {
      addVariant('scrolled', '&.scrolled');
    })
  ],
}
