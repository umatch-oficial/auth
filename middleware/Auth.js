'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const coFs = require('co-functional')
const CE = require('../src/Exceptions')

class Auth {

  _tryFail (request, authenticators) {
    return coFs.forEachSerial(function * (authenticator) {
      const result = yield request.auth.authenticator(authenticator).check()
      if (result) {
        /**
         * we need to break the loop as soon as an authenticator
         * returns true. Ideally one cannot break promises chain
         * without throwing an error, so here we throw an error
         * and handle it gracefully
         */
        throw new Error('Break loop')
      }
    }, authenticators)
  }

  * _authenticate (request, authenticators) {
    try {
      yield this._tryFail(request, authenticators)
      return false
    } catch (e) {
      return e.message === 'Break loop'
    }
  }

  * handle (request, response, next) {
    let authenticators = Array.prototype.slice.call(arguments)
    authenticators = authenticators.splice(3, authenticators.length)
    const isLoggedIn = yield this._authenticate(request, authenticators)
    if (!isLoggedIn) {
      throw new CE.InvalidLoginException('Login Failure')
    }
    yield next
  }

}

module.exports = Auth
