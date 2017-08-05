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
const BaseScheme = require('./Base')
const GE = require('@adonisjs/generic-exceptions')
const CE = require('../Exceptions')

class JwtScheme extends BaseScheme {
  constructor () {
    super()
    this._generateRefreshToken = new Resetable(false)
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
  _signToken (payload) {
    return new Promise((resolve, reject) => {
      const options = _.omit(this.jwtOptions, 'secret')
      jwt.sign(payload, this.jwtSecret, options, (error, token) => {
        if (error) {
          reject(error)
        } else {
          resolve(token)
        }
      })
    })
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
    return new Promise((resolve, reject) => {
      const options = _.omit(this.jwtOptions, 'secret')
      jwt.verify(token, this.jwtSecret, options, (error, payload) => {
        if (error) {
          reject(error)
        } else {
          resolve(payload)
        }
      })
    })
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
   * Attempt to valid the user credentials and then
   * generates a new token for it.
   *
   * @method attempt
   *
   * @param  {String} uid
   * @param  {String} password
   *
   * @return {String}
   */
  async attempt (uid, password, jwtPayload) {
    const user = await this.validate(uid, password, true)
    return this.generate(user, jwtPayload)
  }

  /**
   * Generates a jwt token for a user
   *
   * @method generate
   * @async
   *
   * @param  {Object} user
   * @param  {Object|Boolean} [jwtPayload] Pass true when want to attach user object in the payload
   *                                       or set a custom object
   *
   * @return {Object}
   *
   * @throws {RuntimeException} If jwt secret is not defined or user doesn't have a primary key value
   */
  async generate (user, jwtPayload) {
    /**
     * Throw exception when trying to generate token without
     * jwt secret
     */
    if (!this.jwtSecret) {
      throw GE.RuntimeException.incompleteConfig('jwt', ['secret'], 'config/auth.js')
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
      payload.data = typeof (user.toJSON) === 'function' ? user.toJSON() : user
    } else if (_.isPlainObject(jwtPayload)) {
      /**
       * Attach payload as it is when it's an object
       */
      payload.data = jwtPayload
    }

    /**
     * Return the generate token
     */
    const token = await this._signToken(payload)
    const withRefresh = this._generateRefreshToken.pull()
    const refreshToken = withRefresh ? await this._saveRefreshToken(user) : null
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
   *
   * @method generateForRefreshToken
   *
   * @return {Object}
   */
  async generateForRefreshToken (refreshToken, jwtPayload) {
    const user = await this._serializerInstance.findByToken(refreshToken, 'jwt_refresh_token')
    if (!user) {
      throw CE
        .UserNotFoundException
        .invoke(`Cannot find user with refresh token as ${refreshToken}`)
    }

    await this._serializerInstance.revokeTokens(user, [refreshToken])
    return this.withRefreshToken().generate(user, jwtPayload)
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
        throw CE.JwtTokenException.expired()
      }
      throw CE.JwtTokenException.invoke(message)
    }

    this.user = await this._serializerInstance.findById(this.jwtPayload.uid)

    /**
     * Throw exception when user is not found
     */
    if (!this.user) {
      throw CE
        .UserNotFoundException
        .invoke(`Cannot find user with ${this.primaryKey} as ${this.jwtPayload.uid}`)
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
}

module.exports = JwtScheme
