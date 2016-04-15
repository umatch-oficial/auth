'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 * NOTE
 * Authenticator instance is created by AuthManager and owns the
 * constructor. In case of any IoC injections, wrap original
 * class inside another class.
*/

const CE = require('../../Exceptions')

class SessionAuthenticator {

  constructor (request, serializer, options) {
    this.request = request
    this.serializer = serializer
    this.options = options
    this.user = null // this property is set once per request
  }

  /**
   * returns key to be used for saving session value.
   * @return {String}
   *
   * @public
   */
  get sessionKey () {
    return 'adonis-auth'
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
    const userSession = yield this.request.session.get(this.sessionKey)
    if (!userSession) {
      return false
    }
    const user = yield this.serializer.findById(userSession, this.options)
    if (!user) {
      return false
    }
    this.user = user
    return true
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
   * login a user using the user object, it blindly trusts the
   * input.
   *
   * @param  {Object} user
   * @return {Boolean}
   *
   * @throws InvalidArgumentException when primary key value does not exists
   *         													on the input
   *
   * @public
   */
  * login (user) {
    const primaryKey = this.serializer.primaryKey(this.options)
    const primaryValue = user[primaryKey]
    if (!primaryValue) {
      throw new CE.InvalidArgumentException(`Value for ${primaryKey} is null for given user.`)
    }
    yield this.request.session.put(this.sessionKey, primaryValue)
    this.user = user
    return true
  }

  /**
   * logout a user by removing session and setting
   * local instance to null
   *
   * @return {Boolean}
   *
   * @public
   */
  * logout () {
    yield this.request.session.forget(this.sessionKey)
    this.user = null
    return true
  }

  /**
   * login a user using the userId, it does verify the user
   * using the serializer.
   *
   * @param  {Number} userId
   * @return {Boolean}
   *
   * @public
   */
  * loginViaId (userId) {
    const user = yield this.serializer.findById(userId, this.options)
    if (!user) {
      return false
    }
    return yield this.login(user)
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

  /**
   * validates user credentials using validate method and login a
   * user if validate succeeds.
   *
   * @param  {String} uid
   * @param  {String} password
   * @param  {Object} constraints
   * @return {Boolean}
   *
   * @see validate
   * @see login
   *
   * @public
   */
  * attempt (uid, password, constraints) {
    const user = yield this.validate(uid, password, constraints, true)
    return yield this.login(user)
  }

}

module.exports = SessionAuthenticator
