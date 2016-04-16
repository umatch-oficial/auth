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

  get jwtOptions () {
    return this.options.options || {}
  }

  /**
   * returns token passed inside request, it will look
   * for following places.
   * Request header - Authorization=Bearer 'token'
   * Query string - token='token'
   * Request body - token='token'
   *
   * @return {String|Null}
   *
   * @private
   */
  _getRequestToken () {
    let token = this.request.header('authorization')
    if (token) {
      token = token.split(' ')
      return (token.length === 2 && token[0] === 'Bearer') ? token[1] : null
    }
    return this.request.input('token')
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

}

module.exports = JwtAuthenticator
