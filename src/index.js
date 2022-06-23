import presetUno from '@unocss/preset-uno'
import requireFresh from 'import-fresh'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { resolveConfigFile } from 'prettier'
import prettierParserHTML from 'prettier/parser-html'

let sveltePlugin = null
let rules

function uniq(value) {
  return Array.from(new Set(value))
}
function toArray(value) {
  return Array.isArray(value) ? value : [value]
}

function sortUtillities(a, b) {
  if (a.includes(':')) return 1
  if (b.includes(':')) return -1

  //for each index and value of rules array
  let aSortIndex = 0
  let bSortIndex = 0

  for (let [index, value] of rules.entries()) {
    if (typeof value[0] === 'string') {
      if (new RegExp(value[0], 'g').test(a)) aSortIndex = index
      if (new RegExp(value[0], 'g').test(b)) bSortIndex = index
    } else {
      if (value[0].test(a)) aSortIndex = index
      if (value[0].test(b)) bSortIndex = index
    }
  }

  if (bSortIndex < aSortIndex) {
    return 1
  } else if (bSortIndex == aSortIndex) {
    return a < b ? -1 : 1
  } else {
    return -1
  }
}

function format(input, regex, options) {
  let prettierConfigPath = resolveConfigFile.sync(options.filepath)
  let baseDir = prettierConfigPath
    ? dirname(prettierConfigPath)
    : process.env.VSCODE_CWD ?? process.cwd()
  let unoConfigPath = resolve(baseDir, 'unocss.config.cjs')

  if (existsSync(unoConfigPath)) {
    

    let unoConfig = requireFresh(unoConfigPath)
    

    rules = uniq([
      ...unoConfig.presets.flatMap((p) => toArray(p['rules'] || [])),
      ...toArray(unoConfig['rules'] || []),
    ])
  } else {
    

    rules = presetUno().rules
  }

  const output = input.replace(regex, (match) => {
    if (match.includes('{')) return match
    if (match.includes('}')) return match
    const groups = []
    const groupRegex = /([!\w][\w:_/-]*?):\(([\w\s/-]*?)\)/g
    const utils = match.replace(groupRegex, (group, variant, utillities) => {
      groups.push(`${variant}:(${utillities.split(' ').sort(sortUtillities).join(' ')})`)
      return ''
    })
    return (utils.split(' ').sort(sortUtillities).join(' ') + ' ' + groups.join(' ')).trim()
  })
  return output
}

function makeChoice(choice) {
  return { value: choice, description: choice }
}

export const options = {
  svelteSortOrder: {
    since: '0.6.0',
    category: 'Svelte',
    type: 'choice',
    default: 'options-scripts-markup-styles',
    description: 'Sort order for scripts, markup, and styles',
    choices: [
      makeChoice('options-scripts-markup-styles'),
      makeChoice('options-scripts-styles-markup'),
      makeChoice('options-markup-styles-scripts'),
      makeChoice('options-markup-scripts-styles'),
      makeChoice('options-styles-markup-scripts'),
      makeChoice('options-styles-scripts-markup'),
      makeChoice('scripts-options-markup-styles'),
      makeChoice('scripts-options-styles-markup'),
      makeChoice('markup-options-styles-scripts'),
      makeChoice('markup-options-scripts-styles'),
      makeChoice('styles-options-markup-scripts'),
      makeChoice('styles-options-scripts-markup'),
      makeChoice('scripts-markup-options-styles'),
      makeChoice('scripts-styles-options-markup'),
      makeChoice('markup-styles-options-scripts'),
      makeChoice('markup-scripts-options-styles'),
      makeChoice('styles-markup-options-scripts'),
      makeChoice('styles-scripts-options-markup'),
      makeChoice('scripts-markup-styles-options'),
      makeChoice('scripts-styles-markup-options'),
      makeChoice('markup-styles-scripts-options'),
      makeChoice('markup-scripts-styles-options'),
      makeChoice('styles-markup-scripts-options'),
      makeChoice('styles-scripts-markup-options'),
      // Deprecated, keep in 2.x for backwards-compatibility. svelte:options will be moved to the top
      makeChoice('scripts-markup-styles'),
      makeChoice('scripts-styles-markup'),
      makeChoice('markup-styles-scripts'),
      makeChoice('markup-scripts-styles'),
      makeChoice('styles-markup-scripts'),
      makeChoice('styles-scripts-markup'),
    ],
  },
  svelteStrictMode: {
    category: 'Svelte',
    type: 'boolean',
    default: false,
    description: 'More strict HTML syntax: self-closed tags, quotes in attributes',
  },
  svelteAllowShorthand: {
    category: 'Svelte',
    type: 'boolean',
    default: true,
    description:
      'Option to enable/disable component attribute shorthand if attribute name and expressions are same',
  },
  svelteIndentScriptAndStyle: {
    category: 'Svelte',
    type: 'boolean',
    default: true,
    description:
      'Whether or not to indent the code inside <script> and <style> tags in Svelte files',
  },
}

export const languages = [
  {
    name: 'svelte',
    parsers: ['svelte'],
    extensions: ['.svelte'],
    vscodeLanguageIds: ['svelte'],
  },
]

export const parsers = {
  html: {
    astFormat: prettierParserHTML.parsers.html.astFormat,
    parse: prettierParserHTML.parsers.html.parse,
    locStart: prettierParserHTML.parsers.html.locStart,
    locEnd: prettierParserHTML.parsers.html.locEnd,
    preprocess: (text, options) => {
      return format(text, /(?<=class=")(.*?)(?=")/g, options)
    },
  },
  vue: {
    astFormat: prettierParserHTML.parsers.vue.astFormat,
    parse: prettierParserHTML.parsers.vue.parse,
    locStart: prettierParserHTML.parsers.vue.locStart,
    locEnd: prettierParserHTML.parsers.vue.locEnd,
    preprocess: (text, options) => {
      return format(text, /(?<=class=")(.*?)(?=")/g, options)
    },
  },
  svelte: {
    astFormat: 'svelte-ast',
    parse: (text, parsers, options) => {
      return sveltePlugin.parsers.svelte.parse(text, parsers, options)
    },
    locStart: (node) => {
      return node.start
    },
    locEnd: (node) => {
      return node.end
    },
    preprocess: (text, options) => {
      sveltePlugin = options.plugins.find(
        (plugin) => plugin.parsers.svelte && plugin.name.includes('prettier-plugin-svelte')
      )

      return format(
        sveltePlugin.parsers.svelte.preprocess(text, options),
        /(?<=class=")(.*?)(?=")/g,
        options
      )
    },
  },
}
