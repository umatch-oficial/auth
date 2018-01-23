'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const uuid = require('uuid')
const BaseScheme = require('./Base')
const GE = require('@adonisjs/generic-exceptions')
const CE = require('../Exceptions')
const debug = require('debug')('adonis:auth')

/**
 * This scheme allows to make use of Github style personal API tokens
 * to authenticate a user.
 *
 * The tokens for a give user are stored inside the database and user sends
 * a token inside the `Authorization` header as following.
 *
 * ```
 * Authorization=Bearer TOKEN
 * ```
 *
 * ### Note
 * Token will be encrypted using `EncryptionProvider` before sending it to the user.
 *
 * @class ApiScheme
 * @extends BaseScheme
 */
class ApiScheme extends BaseScheme {
  constructor (Encryption) {
    super()
    this.Encryption = Encryption
  }

  /* istanbul ignore next */
  /**
   * IoC container injections
   *
   * @attribute inject
   * @ignore
   *
   * @type {Array}
   */
  static get inject () {
    return ['Adonis/Src/Encryption']
  }

  /**
   * Attempt to valid the user credentials and then
   * generates a new token for it.
   *
   * The token is also saved inside the database.
   *
   * @method attempt
   * @async
   *
   * @param  {String} uid
   * @param  {String} password
   *
   * @return {Object}
   *         {String} type - Bearer
   *
   * @example
   * ```js
   * try {
   *   const token = auth.attempt(username, password)
   * } catch (error) {
   *   // Invalid credentials
   * }
   * ```
   */
  async attempt (uid, password) {
    const user = await this.validate(uid, password, true)
    return this.generate(user)
  }

  /**
   * Generates a personal API token for a user. The user payload must
   * be valid as per the serializer in use.
   *
   * @method generate
   * @async
   *
   * @param  {Object} user
   *
   * @return {Object}
   *
   * @example
   * ```js
   * try {
   *   const user = await User.find(1)
   *   const token = auth.generate(user)
   * } catch (error) {
   *   // Unexpected error
   * }
   * ```
   */
  async generate (user) {
    /**
     * Throw exception when user is not persisted to
     * database
     */
    const userId = user[this.primaryKey]
    if (!userId) {
      throw GE.RuntimeException.invoke('Primary key value is missing for user')
    }

    const plainToken = uuid.v4().replace(/-/g, '')
    await this._serializerInstance.saveToken(user, plainToken, 'api_token')

    /**
     * Encrypting the token before giving it to the
     * user.
     */
    debug('encrypting api token before')
    const token = this.Encryption.encrypt(plainToken)
    return { type: 'bearer', token }
  }

  /**
   * Validates the API token by reading it from the request
   * header or using `token` input field as the fallback.
   *
   * @method check
   * @async
   *
   * @return {void}
   *
   * @throws {InvalidApiToken} If token is missing or is invalid
   *
   * @example
   * ```js
   * try {
   *   await auth.check()
   * } catch (error) {
   *   // Invalid token
   * }
   * ```
   */
  async check () {
    /**
     * User already exists for this request, so there is
     * no need to re-pull them from the database
     */
    if (this.user) {
      return true
    }

    const token = this.getAuthHeader()
    if (!token) {
      throw CE.InvalidApiToken.invoke()
    }

    /**
     * Decrypting the token before querying
     * the db.
     */
    const plainToken = this.Encryption.decrypt(token)
    debug('decrypted api token')

    this.user = await this._serializerInstance.findByToken(plainToken, 'api_token')

    /**
     * Throw exception when user is not found
     */
    if (!this.user) {
      throw CE.InvalidApiToken.invoke()
    }

    return true
  }

  /**
   * Makes sure the user is loggedin and then returns
   * the logged in user instance.
   *
   * @method getUser
   * @async
   *
   * @return {Object}
   *
   * @throws {InvalidApiToken} If token is missing or is invalid
   *
   * @example
   * ```js
   * try {
   *   const user = await auth.getUser()
   * } catch (error) {
   *   // Invalid token
   * }
   * ```
   */
  async getUser () {
    await this.check()
    return this.user
  }

  /**
   * List tokens for a given user for the
   * currently logged in user.
   *
   * @method listTokens
   * @async
   *
   * @param  {Object} forUser
   *
   * @return {Array}
   */
  async listTokens (forUser) {
    forUser = forUser || this.user
    if (!forUser) {
      return []
    }

    const tokens = await this._serializerInstance.listTokens(forUser, 'api_token')
    return tokens.toJSON().map((token) => {
      token.token = this.Encryption.encrypt(token.token)
      return token
    })
  }

  /**
   * Login a user as a client. This method will set the
   * API token as a header on the request.
   *
   * Adonis testing engine uses this method.
   *
   * @method clientLogin
   *
   * @param  {Function}    headerFn     - Method to set the header
   * @param  {Function}    sessionFn    - Method to set the session
   * @param  {Object}      user         - User to login
   *
   * @return {void}
   */
  clientLogin (headerFn, sessionFn, token) {
    headerFn('authorization', `Bearer ${token}`)
  }
}

module.exports = ApiScheme
