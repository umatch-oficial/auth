'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

class AuthInit {

  constructor (AuthManager, Config, View) {
    this.AuthManager = AuthManager
    this.Config = Config
    this.view = View
  }

  * handle (request, response, next) {
    const AuthManager = this.AuthManager
    request.auth = new AuthManager(this.Config, request)
    request.currentUser = yield request.auth.getUser()
    this.view.global('currentUser', request.currentUser)
    yield next
  }

}

module.exports = AuthInit
