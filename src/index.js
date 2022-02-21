// const resolvedConfig = resolveConfig(config)
// const presets = resolvedConfig.presets
// function mergePresets<T extends 'rules'>(key: T, presets, config): Required<UserConfig>[T] {
//   return uniq([
//     ...presets.flatMap(p => toArray(p[key] || []) as any[]),
//     ...toArray(config[key] || []) as any[],
//   ])
// }

// const rules = mergePresets('rules', resolvedConfig.presets, config)

import prettierParserHTML from 'prettier/parser-html'
import presetUno from '@unocss/preset-uno'

const rules = presetUno().rules

// let check = 'bg-gray-400'
// console.log(
//   rules.findIndex((rule) => {
//     if (typeof rule[0] == 'string') {
//       return new RegExp(rule[0]).test(check)
//     } else {
//       return rule[0].test(check)
//     }
//   })
// )

export const options = {}

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

  return bSortIndex < aSortIndex ? 1 : -1
}

let sveltePlugin = null

export const parsers = {
  html: {
    astFormat: prettierParserHTML.parsers.html.astFormat,
    parse: prettierParserHTML.parsers.html.parse,
    locStart: prettierParserHTML.parsers.html.locStart,
    locEnd: prettierParserHTML.parsers.html.locEnd,
    preprocess: (text, options) => {
      // global regex to replace all classes with their order
      const regex = /(?<=class=")(.*?)(?=")/g
      const result = text.replace(regex, (match) => {
        const groups = []
        const groupRegex = /([!\w][\w:_/-]*?):\(([\w\s/-]*?)\)/g
        const utils = match.replace(groupRegex, (group, variant, utillities) => {
          groups.push(`${variant}:(${utillities.split(' ').sort(sortUtillities).join(' ')})`)
          return ''
        })
        return utils.split(' ').sort(sortUtillities).join(' ') + ' ' + groups.join(' ')
      })

      return result
    },
  },
  // vue: {
  //   astFormat:prettierParserHTML.parsers.vue.astFormat,
  //   parse: prettierParserHTML.parsers.vue.parse,
  //   locStart: prettierParserHTML.parsers.vue.locStart,
  //   locEnd:  prettierParserHTML.parsers.vue.locEnd,
  //   preprocess: (text, options) => {

  //     // global regex to replace all classes with their order
  //     const regex = /(?<=class=")(.*?)(?=")/g
  //     const result = text.replace(regex, (match) => {
  //       return "needs to be sorted"
  //     })

  //     return result
  //   },
  // },
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
      // console.log(options.plugins)
      sveltePlugin = options.plugins.find(
        (plugin) => plugin.parsers.svelte && plugin.name.includes('prettier-plugin-svelte')
      )
      // console.log(sveltePlugin.parsers.svelte.preprocess(text, options))

      // return sveltePlugin.parsers.svelte.preprocess(text, options)
      // global regex to replace all classes with their order
      const regex = /(?<=class=")(.*?)(?=")/g
      const result = sveltePlugin.parsers.svelte
        .preprocess(text, options)
        .replace(regex, (match) => {
          return match.split(' ').sort().join(' ')
        })

      return result
    },
  },
  // css: createParser(prettierParserPostCSS.parsers.css, transformCss),
  // scss: createParser(prettierParserPostCSS.parsers.scss, transformCss),
  // less: createParser(prettierParserPostCSS.parsers.less, transformCss),
}
