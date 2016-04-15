'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const CE = require('../Exceptions')

class BaseAuthenticator {

  constructor (request, serializer, options) {
    this.request = request
    this.serializer = serializer
    this.options = options
    this.user = null // this property is set once per request
  }

  /**
   * checks whether a user is logged in or not. It
   * is performed by excuting following steps in
   * sequence.
   * 1. return true - If user exists on the instance
   * 2. Check for session value
   * 		a) return false - If session does not exists
   * 		b) Go to step 3
   * 3. find the user using the serializer and passing id
   * 		a) return false - If user does not exist
   * 		b) Go to step 4
   * 4. set user object on instance and return true
   *
   * @return {Boolean}
   */
  * check () {
    if (this.user) {
      return true
    }
    const requestUser = yield this._getRequestUser()
    this.user = requestUser
    return requestUser ? true : false
  }

  /**
   * returns the logged in user by calling check method
   *
   * @return {Object}
   *
   * @public
   */
  * getUser () {
    const isLoggedIn = yield this.check()
    if (!isLoggedIn) {
      return null
    }
    return this.user
  }

  /**
   * validates a user with uid and password.
   *
   * @param  {String} uid
   * @param  {String} password
   * @param  {Object} [constraints]
   * @param  {Boolean} [returnUser]
   * @return {Boolean|Object}
   *
   * @throws UserNotFoundException when unable to locate user
   * @throws PasswordMisMatchException when password does not match
   */
  * validate (uid, password, constraints, returnUser) {
    const user = yield this.serializer.findByCredentials(uid, constraints, this.options)
    if (!user) {
      throw new CE.UserNotFoundException(`Unable to find user with ${uid} ${this.options.uid}`)
    }
    const isValid = yield this.serializer.validateCredentials(user, password, this.options)
    if (!isValid) {
      throw new CE.PasswordMisMatchException('Password does not match')
    }
    return returnUser ? user : true
  }

}

module.exports = BaseAuthenticator
