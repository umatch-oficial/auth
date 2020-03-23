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
import { Exception } from '@poppinss/utils'
import { EmitterContract } from '@ioc:Adonis/Core/Event'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import {
  SessionDriverConfig,
  ProvidersContract,
  SessionDriverContract,
  SessionLoginEventData,
  AuthenticatableContract,
  SessionAuthenticateEventData,
} from '@ioc:Adonis/Addons/Auth'

import {
  AuthenticationFailureException,
  CredentialsVerficationException,
} from '../../Exceptions'

/**
 * Session driver enables user login using session. Also it allows user
 * to opt for remember me token.
 */
export class SessionDriver implements SessionDriverContract<any> {
  constructor (
    private name: string,
    private appKey: string,
    private config: SessionDriverConfig<any>,
    private emitter: EmitterContract,
    public provider: ProvidersContract<any>,
    private ctx: HttpContextContract,
  ) {
    this.ensureAppKey()
  }

  /**
   * Ensures that app key exists.
   */
  private ensureAppKey () {
    if (this.appKey) {
      return
    }

    throw new Exception('"app.appKey" is required to initiate auth session driver', 500, 'E_MISSING_APP_KEY')
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
    return `auth_${this.config.identifier || this.name}`
  }

  /**
   * The name of the session key name
   */
  public get rememberMeKeyName () {
    return `remember_${this.config.identifier || this.name}`
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
  private setSession (user: AuthenticatableContract<any>) {
    this.ctx.session.put(this.sessionKeyName, user.getId()!)
    this.ctx.session.regenerate()
  }

  /**
   * Creates a random string for a given length
   */
  private generateToken (length: number): string {
    return randomBytes(Math.ceil(length * 0.5)).toString('hex').slice(0, length)
  }

  /**
   * Persists remember me token with the provider.
   */
  private async persistRememberMeToken (authenticatable: AuthenticatableContract<any>) {
    await this.provider.updateRememberMeToken(authenticatable)
  }

  /**
   * Sets the remember me token cookie
   */
  private setRememberMeCookie (user: AuthenticatableContract<any>) {
    const rememberMeToken = JWS.sign({
      id: user.getId()!,
      token: user.getRememberMeToken()!,
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
   * Returns data packet for the login event. Arguments are
   *
   * - The mapping identifier
   * - Logged in user
   * - HTTP context
   * - Remember me token (optional)
   */
  private getLoginEventData (authenticatable: AuthenticatableContract<any>): SessionLoginEventData<any> {
    return [this.config.identifier || this.name, authenticatable.user, this.ctx, authenticatable.getRememberMeToken()]
  }

  /**
   * Returns data packet for the authenticate event. Arguments are
   *
   * - The mapping identifier
   * - Logged in user
   * - HTTP context
   * - A boolean to tell if logged in viaRemember or not
   */
  private getAuthenticateEventData (
    authenticatable: AuthenticatableContract<any>,
    viaRemember: boolean,
  ): SessionAuthenticateEventData<any> {
    return [this.config.identifier || this.name, authenticatable.user, this.ctx, viaRemember]
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
   * Lookup user using UID
   */
  private async lookupUsingUid (uid): Promise<AuthenticatableContract<any>> {
    const authenticatable = await this.provider.findByUid(uid)
    if (!authenticatable.user) {
      throw CredentialsVerficationException.invalidUid(this.config.provider.uids)
    }

    return authenticatable
  }

  /**
   * Verify user password
   */
  private async verifyPassword (authenticatable: AuthenticatableContract<any>, password: string): Promise<void> {
    /**
     * Verify password or raise exception
     */
    const verified = await authenticatable.verifyPassword(password)
    if (!verified) {
      throw CredentialsVerficationException.invalidPassword()
    }
  }

  /**
   * Verifies user credentials
   */
  public async verifyCredentials (uid: string, password: string): Promise<any> {
    /**
     * Find user or raise exception
     */
    const authenticatable = await this.lookupUsingUid(uid)
    await this.verifyPassword(authenticatable, password)
    return authenticatable.user
  }

  /**
   * Verify user credentials and perform login
   */
  public async attempt (uid: string, password: string, remember?: boolean): Promise<any> {
    const authenticatable = await this.lookupUsingUid(uid)
    await this.verifyPassword(authenticatable, password)
    await this.login(authenticatable.user, remember)
    return authenticatable.user
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
    const authenticatable = new this.config.provider.authenticatable(user, this.config.provider)

    /**
     * Update user reference
     */
    this.user = authenticatable.user
    this.setSession(authenticatable)

    /**
     * Set remember me token when enabled
     */
    if (remember) {
      /**
       * Create and persist the user remember me token, when an existing one is missing
       */
      if (!authenticatable.getRememberMeToken()) {
        authenticatable.setRememberMeToken(this.generateToken(20))
        await this.persistRememberMeToken(authenticatable)
      }
      this.setRememberMeCookie(authenticatable)
    } else {
      /**
       * Clear remember me cookie, which may have been set previously.
       */
      this.clearRememberMeCookie()
    }

    this.emitter.emit('auth:session:login', this.getLoginEventData(authenticatable))
    return authenticatable.user
  }

  /**
   * Login user using their id
   */
  public async loginViaId (id: string | number, remember?: boolean): Promise<void> {
    const authenticatable = await this.provider.findById(id)
    if (!authenticatable.user) {
      throw CredentialsVerficationException.invalidId(this.config.provider.identifierKey, id)
    }

    await this.login(authenticatable.user, remember)
    return authenticatable.user
  }

  /**
   * Authenticates the current HTTP request by checking for the user
   * session
   */
  public async authenticate (): Promise<void> {
    const sessionId = this.getRequestSessionId()

    /**
     * If session id exists, then attempt to login the user using the
     * session
     */
    if (sessionId) {
      const authenticatable = await this.getUserForSessionId(sessionId)
      this.user = authenticatable.user
      this.isAuthenticated = true
      this.emitter.emit('auth:session:authenticate', this.getAuthenticateEventData(authenticatable, false))
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
    const authenticatable = await this.getUserForRememberMeToken(id, token)
    this.user = authenticatable.user
    this.isAuthenticated = true
    this.viaRemember = true

    /**
     * Renew remember me cookie
     */
    this.touchRememberMeCookie(rememberMeToken)
    this.emitter.emit('auth:session:authenticate', this.getAuthenticateEventData(authenticatable, true))

    /**
     * Update the session to re-login the user
     */
    this.setSession(authenticatable)
  }

  /**
   * Same as [[authenicate]] but returns a boolean over raising exceptions
   */
  public async check (): Promise<boolean> {
    try {
      await this.authenticate()
      return true
    } catch {
      return false
    }
  }

  public async logout () {
    const rememberMeToken = this.ctx.request.cookie(this.rememberMeKeyName)
    this.ctx.session.forget(this.sessionKeyName)
    this.clearRememberMeCookie()

    if (!rememberMeToken) {
      return
    }

    try {
    } catch (error) {
    }
  }
}
