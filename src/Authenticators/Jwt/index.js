'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const jwt = require('jsonwebtoken')
const NE = require('node-exceptions')
const BaseAuthenticator = require('../BaseAuthenticator')

class JwtAuthenticator extends BaseAuthenticator {

  constructor (request, serializer, options) {
    super(request, serializer, options)
    if (!options.secret) {
      throw new NE.DomainException('Add secret key to the jwt configuration block')
    }
  }

  /**
   * returns default jwtOptions to be used while
   * generating and verifying tokens.
   *
   * @return {Object}
   *
   * @private
   */
  get jwtOptions () {
    return this.options.options || {}
  }

  /**
   * returns a signed token with given payload
   * @param  {Mixed} payload
   * @param  {Object} [options]
   * @return {Promise}
   *
   * @private
   */
  _signToken (payload, options) {
    return new Promise((resolve) => {
      jwt.sign({payload: payload}, this.options.secret, options, function (token) {
        resolve(token)
      })
    })
  }

  /**
   * verifies request JWT token
   *
   * @param  {String} token
   * @return {Promise}
   *
   * @private
   */
  _verifyRequestToken (token, options) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.options.secret, options, (error, decoded) => {
        if (error) {
          return reject(error)
        }
        resolve(decoded)
      })
    })
  }

  /**
   * returns user by verifying request token and
   * using serializer to get user.
   *
   * @return {String}
   *
   * @private
   */
  * _getRequestUser () {
    try {
      const requestToken = yield this.decode()
      const userId = requestToken.payload || null
      if (!userId) {
        return null
      }
      return yield this.serializer.findById(userId, this.options)
    } catch (e) {
      return null
    }
  }

  * generate (user, options) {
    if (!user) {
      throw new NE.InvalidArgumentException('user is required to generate a jwt token')
    }
    const primaryKey = this.serializer.primaryKey(this.options)
    const primaryValue = user[primaryKey]
    if (!primaryValue) {
      throw new NE.InvalidArgumentException(`Value for ${primaryKey} is null for given user.`)
    }
    options = options || this.jwtOptions
    return this._signToken(primaryValue, options)
  }

  * decode (options) {
    options = options || this.jwtOptions
    return yield this._verifyRequestToken(this._getRequestToken(), options)
  }

  * validate () {
    throw new NE.RuntimeException('call to undefined method validate on JWT authenticator instance')
  }

}

module.exports = JwtAuthenticator
