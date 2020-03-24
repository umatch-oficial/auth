/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { JWS } from 'jose'
import { randomBytes } from 'crypto'
import { EmitterContract } from '@ioc:Adonis/Core/Event'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

import {
  ProviderContract,
  SessionGuardConfig,
  ProviderUserContract,
  SessionLoginEventData,
  SessionGuardContract,
  SessionAuthenticateEventData,
} from '@ioc:Adonis/Addons/Auth'

import { AuthenticationFailureException } from '../../Exceptions/AuthenticationFailureException'
import { CredentialsVerficationException } from '../../Exceptions/CredentialsVerficationException'

/**
 * Session authenticator enables user login using session. Also it allows user
 * to opt for remember me token.
 */
export class SessionGuard implements SessionGuardContract<any, any> {
  constructor (
    public name: string,
    private config: SessionGuardConfig<any>,
    private appKey: string,
    private emitter: EmitterContract,
    public provider: ProviderContract<any>,
    private ctx: HttpContextContract,
  ) {
  }

  /**
   * Algorithm for the JWS remember me token
   */
  private jwsAlg = 'HS256'

  /**
   * Number of years for the remember me token expiry
   */
  private rememberMeTokenExpiry = 5

  /**
   * Whether or not the authentication has been attempted
   * for the current request
   */
  public authenticationAttempted = false

  /**
   * Find if the user has been logged out in the current request
   */
  public isLoggedOut = false

  /**
   * A boolean to know if user is retrieved by authenticating
   * the current request or not
   */
  public isAuthenticated = false

  /**
   * A boolean to know if user is loggedin via remember me token
   * or not.
   */
  public viaRemember = false

  /**
   * Logged in or authenticated user
   */
  public user?: any

  /**
   * The name of the session key name
   */
  public get sessionKeyName () {
    return `auth_${this.name}`
  }

  /**
   * The name of the session key name
   */
  public get rememberMeKeyName () {
    return `remember_${this.name}`
  }

  /**
   * Accessor to know if user is logged in
   */
  public get isLoggedIn () {
    return !!this.user
  }

  /**
   * Accessor to know if user is a guest. It is always opposite
   * of [[isLoggedIn]]
   */
  public get isGuest () {
    return !this.isLoggedIn
  }

  /**
   * Set the user id inside the session. Also forces the session module
   * to re-generate the session id
   */
  private setSession (userId: string | number) {
    this.ctx.session.put(this.sessionKeyName, userId)
    this.ctx.session.regenerate()
  }

  /**
   * Creates a random string for a given length
   */
  private generateToken (length: number): string {
    return randomBytes(Math.ceil(length * 0.5)).toString('hex').slice(0, length)
  }

  /**
   * Sets the remember me token cookie
   */
  private setRememberMeCookie (userId: string | number, token: string) {
    const rememberMeToken = JWS.sign({
      id: userId,
      token: token,
    }, this.appKey, { alg: this.jwsAlg })

    this.touchRememberMeCookie(rememberMeToken)
  }

  /**
   * Touch the cookie to reset the expiry
   */
  private touchRememberMeCookie (value: string) {
    this.ctx.response.cookie(this.rememberMeKeyName, value, {
      maxAge: `${this.rememberMeTokenExpiry}y`,
      httpOnly: true,
    })
  }

  /**
   * Clears the remember me cookie
   */
  private clearRememberMeCookie () {
    this.ctx.response.clearCookie(this.rememberMeKeyName)
  }

  /**
   * Marks the user as logged out
   */
  private markUserAsLoggedOut () {
    this.isLoggedOut = true
    this.isAuthenticated = false
    this.viaRemember = false
    this.user = null
  }

  /**
   * Marks user as logged-in
   */
  private markUserAsLoggedIn (user: any, authenticated?: boolean, viaRemember?: boolean) {
    this.user = user
    this.isLoggedOut = false
    authenticated && (this.isAuthenticated = true)
    viaRemember && (this.viaRemember = true)
  }

  /**
   * Clears user session and remember me cookie
   */
  private clearUserFromStorage () {
    this.ctx.session.forget(this.sessionKeyName)
    this.clearRememberMeCookie()
  }

  /**
   * Returns data packet for the login event. Arguments are
   *
   * - The mapping identifier
   * - Logged in user
   * - HTTP context
   * - Remember me token (optional)
   */
  private getLoginEventData (user: any, token: string | null): SessionLoginEventData<any> {
    return [this.name, user, this.ctx, token]
  }

  /**
   * Returns data packet for the authenticate event. Arguments are
   *
   * - The mapping identifier
   * - Logged in user
   * - HTTP context
   * - A boolean to tell if logged in viaRemember or not
   */
  private getAuthenticateEventData (user: any, viaRemember: boolean): SessionAuthenticateEventData<any> {
    return [this.name, user, this.ctx, viaRemember]
  }

  /**
   * Lookup user using UID
   */
  private async lookupUsingUid (uid: string): Promise<ProviderUserContract<any>> {
    const providerUser = await this.provider.findByUid(uid)
    if (!providerUser.user) {
      throw CredentialsVerficationException.invalidUid(this.config.provider.uids)
    }

    return providerUser
  }

  /**
   * Verify user password
   */
  private async verifyPassword (providerUser: ProviderUserContract<any>, password: string): Promise<void> {
    /**
     * Verify password or raise exception
     */
    const verified = await providerUser.verifyPassword(password)
    if (!verified) {
      throw CredentialsVerficationException.invalidPassword()
    }
  }

  /**
   * Returns the user id for the current HTTP request
   */
  private getRequestSessionId () {
    return this.ctx.session.get(this.sessionKeyName)
  }

  /**
   * Verifies the remember me token
   */
  private verifyRememberMeToken (rememberMeToken: string) {
    try {
      const payload = JWS.verify(rememberMeToken, this.appKey) as { id: string, token: string }
      if (!payload || !payload.id || !payload.token) {
        throw AuthenticationFailureException.missingSession()
      }

      return payload
    } catch (error) {
      throw AuthenticationFailureException.missingSession()
    }
  }

  /**
   * Returns user from the user session id
   */
  private async getUserForSessionId (id: string | number) {
    const authenticatable = await this.provider.findById(id)
    if (!authenticatable.user) {
      throw AuthenticationFailureException.missingUser()
    }

    return authenticatable
  }

  /**
   * Returns user for the remember me token
   */
  private async getUserForRememberMeToken (id: string, token: string) {
    const authenticatable = await this.provider.findByToken(id, token)
    if (!authenticatable.user) {
      throw AuthenticationFailureException.missingUser()
    }

    return authenticatable
  }

  /**
   * Verifies user credentials
   */
  public async verifyCredentials (uid: string, password: string): Promise<any> {
    const providerUser = await this.lookupUsingUid(uid)
    await this.verifyPassword(providerUser, password)
    return providerUser.user
  }

  /**
   * Verify user credentials and perform login
   */
  public async attempt (uid: string, password: string, remember?: boolean): Promise<any> {
    const providerUser = await this.lookupUsingUid(uid)
    await this.verifyPassword(providerUser, password)
    await this.login(providerUser.user, remember)
    return providerUser.user
  }

  /**
   * Login user using their id
   */
  public async loginViaId (id: string | number, remember?: boolean): Promise<void> {
    const providerUser = await this.provider.findById(id)
    if (!providerUser.user) {
      throw CredentialsVerficationException.invalidId(this.config.provider.identifierKey, id)
    }

    await this.login(providerUser.user, remember)
    return providerUser.user
  }

  /**
   * Login a user
   */
  public async login (user: any, remember?: boolean): Promise<void> {
    /**
     * Since the login method is exposed to the end user, we cannot expect
     * them to instantiate and return an instance of authenticatable, so
     * we create one manually.
     */
    const providerUser = this.provider.getUserFor(user)

    /**
     * Set session
     */
    this.setSession(providerUser.getId()!)

    /**
     * Set remember me token when enabled
     */
    if (remember) {
      /**
       * Create and persist the user remember me token, when an existing one is missing
       */
      if (!providerUser.getRememberMeToken()) {
        this.ctx.logger.trace('generating fresh remember me token')
        providerUser.setRememberMeToken(this.generateToken(20))
        await this.provider.updateRememberMeToken(providerUser)
      }

      this.ctx.logger.trace('defining remember me cookie', { name: this.rememberMeKeyName })
      this.setRememberMeCookie(providerUser.getId()!, providerUser.getRememberMeToken()!)
    } else {
      /**
       * Clear remember me cookie, which may have been set previously.
       */
      this.clearRememberMeCookie()
    }

    this.emitter.emit(
      'auth:session:login',
      this.getLoginEventData(providerUser.user, providerUser.getRememberMeToken()),
    )

    this.markUserAsLoggedIn(providerUser.user)
    return providerUser.user
  }

  /**
   * Authenticates the current HTTP request by checking for the user
   * session
   */
  public async authenticate (): Promise<void> {
    if (this.authenticationAttempted) {
      return
    }

    this.authenticationAttempted = true
    const sessionId = this.getRequestSessionId()

    /**
     * If session id exists, then attempt to login the user using the
     * session
     */
    if (sessionId) {
      const providerUser = await this.getUserForSessionId(sessionId)
      this.markUserAsLoggedIn(providerUser.user, true)
      this.emitter.emit('auth:session:authenticate', this.getAuthenticateEventData(providerUser.user, false))
      return
    }

    /**
     * Raise missing session exception when there is no remember me token.
     */
    const rememberMeToken = this.ctx.request.cookie(this.rememberMeKeyName)
    if (!rememberMeToken) {
      throw AuthenticationFailureException.missingSession()
    }

    /**
     * Ensure remember me token is valid
     */
    const { id, token } = this.verifyRememberMeToken(rememberMeToken)

    /**
     * Attempt to locate the user for remember me token
     */
    const providerUser = await this.getUserForRememberMeToken(id, token)
    this.markUserAsLoggedIn(providerUser.user, true, true)

    /**
     * Renew remember me cookie
     */
    this.touchRememberMeCookie(rememberMeToken)
    this.emitter.emit('auth:session:authenticate', this.getAuthenticateEventData(providerUser.user, true))

    /**
     * Update the session to re-login the user
     */
    this.setSession(providerUser.getId()!)
  }

  /**
   * Same as [[authenicate]] but returns a boolean over raising exceptions
   */
  public async check (): Promise<boolean> {
    try {
      await this.authenticate()
    } catch {
    }
    return this.isAuthenticated
  }

  /**
   * Logout by clearing session and cookies
   */
  public async logout (recycleRememberToken?: boolean) {
    /**
     * Return early when not attempting to re-generate the remember me token
     */
    if (!recycleRememberToken) {
      this.clearUserFromStorage()
      this.markUserAsLoggedOut()
      return
    }

    /**
     * Attempt to authenticate the current request if not already authenticated. This
     * will help us get an instance of the current user
     */
    if (!this.authenticationAttempted) {
      await this.check()
    }

    /**
     * If authentication passed, then re-generate the remember me token
     * for the current user.
     */
    if (this.user) {
      const providerUser = this.provider.getUserFor(this.user)

      this.ctx.logger.trace('re-generating remember me token')
      providerUser.setRememberMeToken(this.generateToken(20))
      await this.provider.updateRememberMeToken(providerUser)
    }

    /**
     * Logout user
     */
    this.clearUserFromStorage()
    this.markUserAsLoggedOut()
  }
}
