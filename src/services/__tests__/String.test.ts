import uniqueNamesGenerator from 'unique-names-generator'

import { generateReleaseName, parameterize } from '@sr-services/String'

describe('String', () => {
  describe('generateReleaseName', () => {
    const adjectives = ['Green']
    const animals = ['Gecko']
    jest.mock('unique-names-generator', () => ({
      adjectives,
      animals,
      uniqueNamesGenerator: jest.fn(),
    }))

    it('generates a random name', () => {
      const spy = jest
        .spyOn(uniqueNamesGenerator, 'uniqueNamesGenerator')
        .mockImplementation(
          (_args?: { dictionaries: string[][]; separator?: string }) =>
            'Green Gecko'
        )
      const release = generateReleaseName()
      expect(uniqueNamesGenerator.uniqueNamesGenerator).toHaveBeenCalledWith({
        dictionaries: expect.arrayContaining([]),
        separator: ' ',
      })
      expect(release).toEqual('Green Gecko')
      spy.mockRestore()
    })
  })

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
