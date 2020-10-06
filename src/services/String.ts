import snakeCase from 'lodash/snakeCase'

/**
 * Converts strings to a format safe for use in URLs, branch names etc.
 *
 * @param {string} str The string to parameterize.
 *
 * @returns {string} The parameterized string.
 */
export const parameterize = (str: string): string =>
  snakeCase(str.trim().toLowerCase())
    .replace(/[^0-9a-z_ ]/g, '')
    .replace(/[_\- ]+/g, '-')
