import { render } from '@sr-services/Template'

describe('Template', () => {
  describe('render', () => {
    it('renders the template', () => {
      const template = 'My name is {{name}}'
      const expected = 'My name is Earl'
      expect(render(template, { name: 'Earl' })).toEqual(expected)
    })
  })
})
