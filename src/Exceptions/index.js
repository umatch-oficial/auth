'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const GE = require('@adonisjs/generic-exceptions')

/**
 * This exception is raised when user is not found. This usally
 * happens when trying to authenticate user using their
 * credentials.
 *
 * @class UserNotFoundException
 */
class UserNotFoundException extends GE.LogicalException {
  static invoke (message) {
    return new this(message, 401, 'E_USER_NOT_FOUND')
  }
}

/**
 * This exception is raised when user password mis-matches. This usally
 * happens when trying to authenticate user using their credentials.
 *
 * @class PasswordMisMatchException
 */
class PasswordMisMatchException extends GE.LogicalException {
  static invoke (message) {
    return new this(message, 401, 'E_PASSWORD_MISMATCH')
  }
}

/**
 * Invalid login exception is raised when unable to
 * login a user.
 *
 * @class InvalidLoginException
 */
class InvalidLoginException extends GE.LogicalException {
  /**
   * User session is invalid but trying to use secure
   * resource
   *
   * @method invalidSession
   *
   * @return {Object}
   */
  static invalidSession () {
    return new this('Invalid session', 401, 'E_INVALID_SESSION')
  }

  /**
   * The basic auth header/credentials are misssing
   *
   * @method missingBasicAuthCredentials
   *
   * @return {Object}
   */
  static missingBasicAuthCredentials () {
    return new this('Cannot parse or read Basic auth header', 401, 'E_MISSING_AUTH_HEADER')
  }
}

/**
 * This exception is raised when jwt token is invalid or
 * unable to find user for JWT token.
 *
 * @class InvalidJwtToken
 */
class InvalidJwtToken extends InvalidLoginException {
  static invoke (message) {
    return new this(message || 'The Jwt token is invalid', 401, 'E_INVALID_JWT_TOKEN')
  }
}

/**
 * This exception is raised when jwt refresh token is
 * invalid.
 *
 * @class InvalidRefreshToken
 */
class InvalidRefreshToken extends InvalidLoginException {
  static invoke (refreshToken) {
    return new this(`Invalid refresh token ${refreshToken}`, 401, 'E_INVALID_JWT_REFRESH_TOKEN')
  }
}

/**
 * This exception is raised when jwt token is expired
 *
 * @class ExpiredJwtToken
 */
class ExpiredJwtToken extends InvalidLoginException {
  static invoke () {
    return new this('The jwt token has been expired. Generate a new one to continue', 401, 'E_JWT_TOKEN_EXPIRED')
  }
}

module.exports = {
  UserNotFoundException,
  PasswordMisMatchException,
  InvalidJwtToken,
  InvalidRefreshToken,
  ExpiredJwtToken,
  InvalidLoginException
}
