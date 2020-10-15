import * as Core from '@actions/core'

import { debug } from '@sr-services/Log'

describe('Log', () => {
  describe('debug', () => {
    it('passes the message on to the actions debugger', () => {
      const spy = jest.spyOn(Core, 'debug')
      debug('input')
      expect(spy).toHaveBeenCalledWith('input')
      spy.mockRestore()
    })

    it('handles objects', () => {
      const spy = jest.spyOn(Core, 'debug')
      debug({ my: 'object' })
      expect(spy).toHaveBeenCalledWith('{\n  "my": "object"\n}')
      spy.mockRestore()
    })
  })
})
