import { parameterize } from '@sr-services/String'

describe('String', () => {
  describe('parameterize', () => {
    it('parameterizes the argument', () => {
      const cases: { [key: string]: string } = {
        'lower case': 'lower-case',
        ' leading and trailing spaces ': 'leading-and-trailing-spaces',
        'MiXeD cAsE': 'mixed-case',
        '  multiple    spaces   ': 'multiple-spaces',
        'numbers-1-2-hyphens_underscores': 'numbers-1-2-hyphens-underscores',
        'mixed spaces and - hyphens': 'mixed-spaces-and-hyphens',
        'non-alpha ! # % & characters': 'non-alpha-characters',
        'multi\nline': 'multi-line',
      }
      Object.keys(cases).forEach((input: string) => {
        expect(parameterize(input)).toEqual(cases[input])
      })
    })
  })
})
