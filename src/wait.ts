/**
 * @param milliseconds The number of milliseconds to wait.
 *
 * @returns A finished message.
 */
export async function wait(milliseconds: number): Promise<string> {
  return new Promise(resolve => {
    if (Number.isNaN(milliseconds)) {
      throw new Error('milliseconds not a number')
    }

    setTimeout(() => resolve('done!'), milliseconds)
  })
}
