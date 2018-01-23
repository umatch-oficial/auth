'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const auth = require('basic-auth')
const BaseScheme = require('./Base')
const CE = require('../Exceptions')

/**
 * @class BasicAuthScheme
 * @extends {BaseScheme}
 */
class BasicAuthScheme extends BaseScheme {
  /**
   * Check whether a user is logged in or
   * not.
   *
   * @method check
   *
   * @return {Boolean}
   */
  async check () {
    if (this.user) {
      return true
    }

    const credentials = auth(this._ctx.request.request)
    if (!credentials) {
      throw CE.InvalidBasicAuthException.invoke()
    }

    this.user = await this.validate(credentials.name, credentials.pass, true)
    return !!this.user
  }

  /**
   * Makes sure user is loggedin and then
   * returns the user back
   *
   * @method getUser
   *
   * @return {Object}
   */
  async getUser () {
    await this.check()
    return this.user
  }

  /**
   * Login as a user by setting basic auth header
   * before the request reaches the server.
   *
   * @param  {Function}    headerFn
   * @param  {Function}    sessionFn
   * @param  {String}      username
   * @param  {String}      password
   *
   * @method clientLogin
   * @async
   *
   * @return {void}
   */
  async clientLogin (headerFn, sessionFn, username, password) {
    headerFn('authorization', `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`)
  }
}

module.exports = BasicAuthScheme
