import presetUno from '@unocss/preset-uno'
import requireFresh from 'import-fresh'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import prettierParserHTML from 'prettier/parser-html'

let sveltePlugin = null
let rules
let unoConfigPath = resolve(process.cwd(), 'unocss.config.cjs')

function uniq(value) {
  return Array.from(new Set(value))
}
function toArray(value) {
  return Array.isArray(value) ? value : [value]
}

if (existsSync(unoConfigPath)) {
  console.log('config exists')

  let unoConfig = requireFresh(unoConfigPath)
  console.log(unoConfig)

  rules = uniq([
    ...unoConfig.presets.flatMap((p) => toArray(p['rules'] || [])),
    ...toArray(unoConfig['rules'] || []),
  ])
} else {
  console.log('config does not exist')

  rules = presetUno().rules
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

function format(input, regex) {
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

export const options = {}

export const parsers = {
  html: {
    astFormat: prettierParserHTML.parsers.html.astFormat,
    parse: prettierParserHTML.parsers.html.parse,
    locStart: prettierParserHTML.parsers.html.locStart,
    locEnd: prettierParserHTML.parsers.html.locEnd,
    preprocess: (text, options) => {
      return format(text, /(?<=class=")(.*?)(?=")/g)
    },
  },
  vue: {
    astFormat: prettierParserHTML.parsers.vue.astFormat,
    parse: prettierParserHTML.parsers.vue.parse,
    locStart: prettierParserHTML.parsers.vue.locStart,
    locEnd: prettierParserHTML.parsers.vue.locEnd,
    preprocess: (text, options) => {
      return format(text, /(?<=class=")(.*?)(?=")/g)
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
        /(?<=class=")(.*?)(?=")/g
      )
    },
  },
  // css: createParser(prettierParserPostCSS.parsers.css, transformCss),
  // scss: createParser(prettierParserPostCSS.parsers.scss, transformCss),
  // less: createParser(prettierParserPostCSS.parsers.less, transformCss),
}
