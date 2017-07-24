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
    return new this(message, 500, 'E_USER_NOT_FOUND')
  }
}

class PasswordMisMatchException extends NE.LogicalException {
  static invoke (message) {
    return new this(message, 500, 'E_PASSWORD_MISMATCH')
  }
}

class RuntimeException extends NE.RuntimeException {
  static authenticatedInstance () {
    return new this('Cannot login multiple users at once, since a user is already logged in', 500, 'E_CANNOT_LOGIN')
  }

  static missingUid () {
    return new this('Cannot login user, since user id is not defined', 500, 'E_CANNOT_LOGIN')
  }
}

module.exports = {
  UserNotFoundException,
  PasswordMisMatchException,
  RuntimeException
}
