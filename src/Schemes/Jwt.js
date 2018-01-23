'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Resetable = require('resetable')
const jwt = require('jsonwebtoken')
const uuid = require('uuid')
const _ = require('lodash')
const util = require('util')
// const debug = require('debug')('adonis:auth')
const GE = require('@adonisjs/generic-exceptions')

const CE = require('../Exceptions')
const BaseScheme = require('./Base')

const signToken = util.promisify(jwt.sign)
const verifyToken = util.promisify(jwt.verify)

/**
 * This scheme allows to make use of JWT tokens to authenticate the user.
 *
 * The user sends a token inside the `Authorization` header as following.
 *
 * ```
 * Authorization=Bearer JWT-TOKEN
 * ```
 *
 * ### Note
 * Token will be encrypted using `EncryptionProvider` before sending it to the user.
 *
 * @class JwtScheme
 * @extends BaseScheme
 */
class JwtScheme extends BaseScheme {
  constructor (Encryption) {
    super()
    this.Encryption = Encryption
    this._generateRefreshToken = new Resetable(false)
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
   * An object of jwt options directly
   * passed to `jsonwebtoken` library
   *
   * @attribute jwtOptions
   *
   * @return {Object|Null}
   */
  get jwtOptions () {
    return _.get(this._config, 'options', null)
  }

  /**
   * The jwt secret
   *
   * @attribute jwtSecret
   *
   * @return {String|Null}
   */
  get jwtSecret () {
    return _.get(this.jwtOptions, 'secret', null)
  }

  /**
   * Signs payload with jwtSecret and options
   *
   * @method _signToken
   * @async
   *
   * @param  {Object}   payload
   *
   * @return {String}
   *
   * @private
   *
   * @throws {Error} If unable to sign payload and generate token
   */
  _signToken (payload, options) {
    options = _.size(options) && _.isPlainObject(options) ? options : _.omit(this.jwtOptions, 'secret')
    return signToken(payload, this.jwtSecret, options)
  }

  /**
   * Verifies the jwt token by decoding it
   *
   * @method _verifyToken
   * @async
   *
   * @param  {String}     token
   *
   * @return {Object}
   *
   * @private
   */
  _verifyToken (token) {
    const options = _.omit(this.jwtOptions, 'secret')
    return verifyToken(token, this.jwtSecret, options)
  }

  /**
   * Saves jwt refresh token for a given user
   *
   * @method _saveRefreshToken
   *
   * @param  {Object}          user
   *
   * @return {String}
   *
   * @private
   */
  async _saveRefreshToken (user) {
    const refreshToken = uuid.v4()
    await this._serializerInstance.saveToken(user, refreshToken, 'jwt_refresh_token')
    return refreshToken
  }

  /**
   * Instruct class to generate a refresh token
   * when generate jwt token
   *
   * @method withRefreshToken
   *
   * @chainable
   */
  withRefreshToken () {
    this._generateRefreshToken.set(true)
    return this
  }

  /**
   * Same as withRefreshToken but a better alias
   * to map with `generateForRefreshToken`
   *
   * @method newRefreshToken
   *
   * @chainable
   */
  newRefreshToken () {
    this._generateRefreshToken.set(true)
    return this
  }

  /**
   * Attempt to valid the user credentials and then
   * generates a new token for it.
   *
   * @method attempt
   * @async
   *
   * @param  {String} uid
   * @param  {String} password
   * @param  {Object|Boolean} [jwtPayload]  Pass true when want to attach user object in the payload
   *                                        or set a custom object.
   * @param  {Object}         [jwtOptions]  Passed directly to https://www.npmjs.com/package/jsonwebtoken
   *
   * @return {Object}
   * - `{ type: 'bearer', token: '...' }`
   *
   * @example
   * ```js
   * try {
   *   const token = auth.attempt(username, password)
   * } catch (error) {
   *    // Invalid credentials
   * }
   * ```
   *
   * Attach user to the JWT payload
   * ```
   * auth.attempt(username, password, true)
   * ```
   *
   * Attach custom data object to the JWT payload
   * ```
   * auth.attempt(username, password, { ipAddress: '...' })
   * ```
   */
  async attempt (uid, password, jwtPayload, jwtOptions) {
    const user = await this.validate(uid, password, true)
    return this.generate(user, jwtPayload, jwtOptions)
  }

  /**
   * Generates a jwt token for a given user. This method doesn't check the existence
   * of the user in the database.
   *
   * @method generate
   * @async
   *
   * @param  {Object} user
   * @param  {Object|Boolean} [jwtPayload]  Pass true when want to attach user object in the payload
   *                                        or set a custom object.
   * @param  {Object}         [jwtOptions]  Passed directly to https://www.npmjs.com/package/jsonwebtoken
   *
   * @return {Object}
   *
   * @throws {RuntimeException} If jwt secret is not defined or user doesn't have a primary key value
   *
   * @example
   * ```js
   * try {
   *   await auth.generate(user)
   * } catch (error) {
   *   // Unexpected error
   * }
   * ```
   *
   * Attach user to the JWT payload
   * ```
   * auth.auth.generate(user, true)
   * ```
   *
   * Attach custom data object to the JWT payload
   * ```
   * auth.generate(user, { ipAddress: '...' })
   * ```
   */
  async generate (user, jwtPayload, jwtOptions) {
    /**
     * Throw exception when trying to generate token without
     * jwt secret
     */
    if (!this.jwtSecret) {
      throw GE.RuntimeException.incompleteConfig(['secret'], 'config/auth.js', 'jwt')
    }

    /**
     * Throw exception when user is not persisted to
     * database
     */
    const userId = user[this.primaryKey]
    if (!userId) {
      throw GE.RuntimeException.invoke('Primary key value is missing for user')
    }

    /**
     * The jwt payload
     *
     * @type {Object}
     */
    const payload = { uid: userId }

    if (jwtPayload === true) {
      /**
       * Attach user as data object only when
       * jwtPayload is true
       */
      const data = typeof (user.toJSON) === 'function' ? user.toJSON() : user

      /**
       * Remove password from jwt data
       */
      payload.data = _.omit(data, this._config.password)
    } else if (_.isPlainObject(jwtPayload)) {
      /**
       * Attach payload as it is when it's an object
       */
      payload.data = jwtPayload
    }

    /**
     * Return the generate token
     */
    const token = await this._signToken(payload, jwtOptions)
    const withRefresh = this._generateRefreshToken.pull()
    const plainRefreshToken = withRefresh ? await this._saveRefreshToken(user) : null

    /**
     * Encrypting the token before giving it to the
     * user.
     */
    const refreshToken = plainRefreshToken ? this.Encryption.encrypt(plainRefreshToken) : null

    return { type: 'bearer', token, refreshToken }
  }

  /**
   * Generate a new token using the refresh token.
   * This method will revoke the existing token
   * and issues a new refresh token
   *
   * @param {String} refreshToken
   * @param  {Object|Boolean} [jwtPayload] Pass true when want to attach user object in the payload
   *                                       or set a custom object
   * @param  {Object}         [jwtOptions = null]
   *
   * @method generateForRefreshToken
   *
   * @return {Object}
   */
  async generateForRefreshToken (refreshToken, jwtPayload, jwtOptions) {
    const user = await this._serializerInstance.findByToken(this.Encryption.decrypt(refreshToken), 'jwt_refresh_token')
    if (!user) {
      throw CE.InvalidRefreshToken.invoke(refreshToken)
    }

    const token = await this.generate(user, jwtPayload)

    /**
     * If user generated a new refresh token, in that case we
     * should revoke the old one, otherwise we should
     * set the refreshToken as the existing refresh
     * token in the return payload
     */
    if (!token.refreshToken) {
      token.refreshToken = refreshToken
    } else {
      await this._serializerInstance.revokeTokens(user, [refreshToken])
    }

    return token
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

    /**
     * Verify jwt token and wrap exception inside custom
     * exception classes
     */
    try {
      this.jwtPayload = await this._verifyToken(this.getAuthHeader())
    } catch ({ name, message }) {
      if (name === 'TokenExpiredError') {
        throw CE.ExpiredJwtToken.invoke()
      }
      throw CE.InvalidJwtToken.invoke(message)
    }

    this.user = await this._serializerInstance.findById(this.jwtPayload.uid)

    /**
     * Throw exception when user is not found
     */
    if (!this.user) {
      throw CE.InvalidJwtToken.invoke()
    }
    return true
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
   * List tokens for a given user for the
   * currently logged in user.
   *
   * @method listTokens
   *
   * @param  {Object} forUser
   *
   * @return {Object}
   */
  async listTokens (forUser) {
    forUser = forUser || this.user
    if (!forUser) {
      return []
    }

    const tokens = await this._serializerInstance.listTokens(forUser, 'jwt_refresh_token')
    return tokens.toJSON().map((token) => {
      token.token = this.Encryption.encrypt(token.token)
      return token
    })
  }

  /**
   * Login a user as a client. This method will set the
   * JWT token as a header on the request.
   *
   * @param  {Function}    headerFn
   * @param  {Function}    sessionFn
   * @param  {Object}      user
   * @param  {Object}      jwtOptions
   *
   * @method clientLogin
   * @async
   *
   * @return {void}
   */
  async clientLogin (headerFn, sessionFn, user) {
    const { token } = await this.generate(user)
    headerFn('authorization', `Bearer ${token}`)
  }
}

module.exports = JwtScheme
