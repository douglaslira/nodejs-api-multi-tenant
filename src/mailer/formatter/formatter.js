/**
  example input:

  {
    to: 'noodle@stir-fry.com',
    from: 'no-reply@foo.bar',
    type: 'confirm-registration',
    language: 'en',
    payload: {
      something: 'foo',
      other_thing: 'bar'
    }
  }

  example output:

  {
    to: 'noodle@stir-fry.com',
    from: 'no-reply@foo.bar',
    subject: 'Confirm your registration at foo.bar',
    html: '<p>lovely markup</p>'
  }

 */

import juice from 'juice'

class Formatter {
  constructor(templates, stylesheets, i18n) {
    this.templates = templates
    this.stylesheets = stylesheets
    this.i18n = i18n
  }
  format(mail) {
    const ctx = { headers: { 'accept-language': mail.language || 'en' } }
    this.i18n.init(ctx)
    const result = {
      ...mail,
      subject: this.formatSubject(ctx, `${mail.type}.subject`, mail.payload),
      html: this.formatHTML(ctx, mail.type, mail.language, mail.payload)
    }
    delete result.payload
    return result
  }
  formatSubject(ctx, type, payload) {
    return ctx.__(type, payload)
  }
  inlineCss(type, language, html) {
    const languageCss = this.stylesheets[language]
    const typeCss = this.stylesheets[type]
    if (typeCss || languageCss) {
      return juice.inlineContent(
        html,
        `${languageCss}${typeCss ? '\r\n\r\n' + typeCss : ''}`
      )
    } else {
      throw new Error(
        'no css found for language ${language} or type ${type}, expected at least ${language}.css and perhaps ${language}-${type}.css'
      )
      return opts.html
    }
  }
  formatHTML(ctx, type, language, payload) {
    const template = this.templates[type]
    if (!template) {
      throw new Error(`missing template ${type}`)
    } else {
      return this.inlineCss(
        type,
        language,
        template.render({
          i18n: () => {
            return (text, render) => {
              return ctx.__(text)
            }
          },
          ...payload
        })
      )
    }
  }
}

export default Formatter
