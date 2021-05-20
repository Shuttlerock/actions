import snakeCase from 'lodash/snakeCase'
import startCase from 'lodash/startCase'
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from 'unique-names-generator'

/**
 * Converts strings to a format safe for use in URLs, branch names etc.
 *
 * @param {string} str The string to parameterize.
 * @returns {string} The parameterized string.
 */
export const parameterize = (str: string): string =>
  snakeCase(str.trim().toLowerCase())
    .replace(/[^0-9a-z_ ]/g, '')
    .replace(/[_\- ]+/g, '-')

/**
 * Returns a random letter of the alphabet.
 *
 * @returns {string} A letter.
 */
const getRandomLetter = (): string => {
  const alphabet = 'abcdefghijklmnopqrstuvwyz'
  return alphabet[Math.floor(Math.random() * alphabet.length)]
}

/**
 * Generates an Ubuntu-style release name (eg. 'Elegant Elk').
 *
 * @returns {string} A randomly generated release name.
 */
export const generateReleaseName = (): string => {
  const letter = getRandomLetter()
  const filteredAdjectives = adjectives.filter((word: string) =>
    word.startsWith(letter)
  )
  const filteredAnimals = animals.filter((word: string) =>
    word.startsWith(letter)
  )

  // If either of the candidate dictionaries are empty, try again with (hopefully) a different letter.
  if (filteredAdjectives.length === 0 || filteredAnimals.length === 0) {
    return generateReleaseName()
  }

  const releaseName = uniqueNamesGenerator({
    dictionaries: [filteredAdjectives, filteredAnimals],
    separator: ' ',
  })

  return startCase(releaseName)
}
