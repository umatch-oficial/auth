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

class BasicAuthScheme extends BaseScheme {
  /**
   * Validate user credentials
   *
   * @method validate
   *
   * @param  {String} uid
   * @param  {String} password
   * @param  {Boolean} returnUser
   *
   * @return {Object}
   *
   * @throws {UserNotFoundException} If unable to find user with uid
   * @throws {PasswordMisMatchException} If password mismatches
   */
  async validate (uid, password, returnUser) {
    const user = await this._serializerInstance.findByUid(uid)
    if (!user) {
      throw CE.UserNotFoundException.invoke(`Cannot find user with ${this._config.uid} as ${uid}`)
    }

    const validated = await this._serializerInstance.validateCredentails(user, password)
    if (!validated) {
      throw CE.PasswordMisMatchException.invoke('Cannot verify user password')
    }

    return returnUser ? user : !!user
  }

  /**
   * Check whether a user is logged in or
   * not. Also this method will re-login
   * the user when remember me token
   * is defined
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
      return false
    }

    try {
      this.user = await this.validate(credentials.name, credentials.pass, true)
      return !!this.user
    } catch (error) {
      return false
    }
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
}

module.exports = BasicAuthScheme
