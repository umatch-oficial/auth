'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const NE = require('node-exceptions')

class UserNotFoundException extends NE.LogicalException {
  static invoke (message) {
    return new this(message, 401, 'E_USER_NOT_FOUND')
  }
}

class PasswordMisMatchException extends NE.LogicalException {
  static invoke (message) {
    return new this(message, 401, 'E_PASSWORD_MISMATCH')
  }
}

class RuntimeException extends NE.RuntimeException {
  static authenticatedInstance () {
    return new this('Cannot login multiple users at once, since a user is already logged in', 500, 'E_CANNOT_LOGIN')
  }

  static missingUid () {
    return new this('Cannot login user, since user id is not defined', 500, 'E_CANNOT_LOGIN')
  }

  static missingScheme (name) {
    return new this(`Unable to find ${name} authentication scheme. Make sure it exists`, 500, 'E_MISSING_AUTH_SCHEME')
  }

  static missingSerializer (name) {
    return new this(`Unable to find ${name} authentication serializer. Make sure it exists`, 500, 'E_MISSING_AUTH_SERIALIZER')
  }

  static missingConfig (key) {
    return new this(`Cannot find config for ${key}`, 500, 'E_MISSING_CONFIG')
  }

  static invalidConfig (key, missingKeys) {
    return new this(`Make sure to define ${missingKeys.join(', ')} on ${key} authenticator`, 500, 'E_INVALID_CONFIG')
  }
}

module.exports = {
  UserNotFoundException,
  PasswordMisMatchException,
  RuntimeException
}
