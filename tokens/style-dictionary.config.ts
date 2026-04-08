import StyleDictionary from 'style-dictionary'

const themes = ['cyberpunk', 'terminal', 'clean-dark', 'light', 'corporate'] as const

type Theme = (typeof themes)[number]

async function buildTheme(theme: Theme): Promise<void> {
  const sd = new StyleDictionary({
    source: ['base.json', `themes/${theme}.json`],
    platforms: {
      css: {
        transformGroup: 'css',
        prefix: 'upp',
        buildPath: '../app/src/lib/themes/',
        files: [
          {
            destination: `${theme}.css`,
            format: 'css/variables',
            options: {
              selector: `[data-theme="${theme}"]`,
              outputReferences: false,
            },
          },
        ],
      },
    },
  })

  await sd.buildAllPlatforms()
}

await Promise.all(themes.map(buildTheme))
