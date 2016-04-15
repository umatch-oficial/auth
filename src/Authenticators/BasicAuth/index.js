'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const BaseAuthenticator = require('../BaseAuthenticator')
const basicAuth = require('basic-auth')

class BasicAuthAuthenticator extends BaseAuthenticator {

  * _getRequestUser () {
    const credentials = basicAuth(this.request.request)
    if (!credentials) {
      return null
    }
    try {
      return yield this.validate(credentials.name, credentials.pass, {}, true)
    } catch (e) {
      return null
    }
  }

}

module.exports = BasicAuthAuthenticator
