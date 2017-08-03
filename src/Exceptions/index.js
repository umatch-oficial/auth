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
 * This exception is raised when user is not found
 *
 * @class UserNotFoundException
 */
class UserNotFoundException extends GE.LogicalException {
  static invoke (message) {
    return new this(message, 401, 'E_USER_NOT_FOUND')
  }
}

/**
 * This exception is raised when user password mis-matches
 *
 * @class PasswordMisMatchException
 */
class PasswordMisMatchException extends GE.LogicalException {
  static invoke (message) {
    return new this(message, 401, 'E_PASSWORD_MISMATCH')
  }
}

/**
 * This exception is raised when jwt token is invalid
 * is expired
 *
 * @class JwtTokenException
 */
class JwtTokenException extends GE.LogicalException {
  static expired () {
    return new this('Token has been expired', 401, 'E_JWT_TOKEN_EXPIRED')
  }

  static invoke (message) {
    return new this(message, 401, 'E_INVALID_JWT_TOKEN')
  }
}

class InvalidLoginException extends GE.LogicalException {
  static missingSession () {
    return new this('No session found for user', 401, 'E_MISSING_SESSION')
  }
}

module.exports = {
  UserNotFoundException,
  PasswordMisMatchException,
  JwtTokenException,
  InvalidLoginException
}
