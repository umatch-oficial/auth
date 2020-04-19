/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'

/**
 * Exception raised when unable to authenticate user session
 */
export class AuthenticationFailureException extends Exception {
  /**
   * There is no session found for the user
   */
  public static missingSession () {
    return new this('Missing user session', 401, 'E_MISSING_AUTH_SESSION')
  }

  /**
   * The user id or remember me token was found, but unable to lookup
   * user from it
   */
  public static missingUser () {
    return new this('Invalid auth session id', 401, 'E_INVALID_AUTH_SESSION')
  }
}
