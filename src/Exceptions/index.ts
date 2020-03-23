/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'
import arrayToSentence from 'array-to-sentence'

/**
 * Exception raised when unable to verify user credentials
 */
export class CredentialsVerficationException extends Exception {
  public static invalidUid (uids: string[]) {
    return new this(`Invalid ${arrayToSentence(uids, { lastSeparator: ' or ' })}`, 401, 'E_INVALID_AUTH_UID')
  }

  public static invalidId (identifierKey: string, value: string | number) {
    return new this(`Cannot lookup user with "${identifierKey}=${value}"`, 401, 'E_INVALID_AUTH_UID')
  }

  public static invalidPassword () {
    return new this('Password mis-match', 401, 'E_INVALID_AUTH_PASSWORD')
  }
}

/**
 * Exception raised when unable to authenticate user session
 */
export class AuthenticationFailureException extends Exception {
  public static missingSession () {
    return new this('Missing user session', 401, 'E_MISSING_AUTH_SESSION')
  }

  public static missingUser () {
    return new this('Invalid auth session id', 401, 'E_INVALID_AUTH_SESSION')
  }
}
