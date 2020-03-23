/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { JWS } from 'jose'
import { DateTime } from 'luxon'
import { randomBytes } from 'crypto'
import { Exception } from '@poppinss/utils'
import { EmitterContract } from '@ioc:Adonis/Core/Event'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import {
  ProvidersList,
  GetProviderUser,
  SessionDriverConfig,
  SessionDriverContract,
  SessionLoginEventData,
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
export class SessionDriver<
  Provider extends keyof ProvidersList
> implements SessionDriverContract<Provider> {
  constructor (
    private name: string,
    private appKey: string,
    private config: SessionDriverConfig<Provider>,
    private emitter: EmitterContract,
    public provider: ProvidersList[Provider]['implementation'],
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
  public user?: GetProviderUser<Provider>

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
  private setSession (user: any) {
    this.ctx.session.put(this.sessionKeyName, user[this.config.provider.identifierKey])
    this.ctx.session.regenerate()
  }

  /**
   * Creates a random string for a given length
   */
  private generateToken (length: number): string {
    return randomBytes(Math.ceil(length * 0.5)).toString('hex').slice(0, length)
  }

  /**
   * Persists remember me token with the provider. The token gets
   * encrypted before persistence
   */
  private async persistRememberMeToken (user: any, token: string) {
    await this.provider.createToken(user, {
      value: token,
      type: 'remember_me',
      expiresOn: DateTime.utc().plus({ years: this.rememberMeTokenExpiry }),
    })
  }

  /**
   * Sets the remember me token cookie
   */
  private setRememberMeCookie (user: any, token: string) {
    const rememberMeToken = JWS.sign({
      id: user[this.config.provider.identifierKey],
      token: token,
    }, this.appKey, { alg: this.jwsAlg })

    this.ctx.response.cookie(this.rememberMeKeyName, rememberMeToken, {
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
  private getLoginEventData (user: any, token?: string): SessionLoginEventData<any> {
    return [this.config.identifier || this.name, user, this.ctx, token]
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
    return [this.config.identifier || this.name, user, this.ctx, viaRemember]
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
    const user = await this.provider.findById(id)
    if (!user) {
      throw AuthenticationFailureException.missingUser()
    }

    return user
  }

  /**
   * Returns user for the remember me token
   */
  private async getUserForRememberMeToken (id: string, token: string) {
    const user = await this.provider.findByToken(id, {
      value: token,
      type: 'remember_me',
    })

    if (!user) {
      throw AuthenticationFailureException.missingUser()
    }

    return user
  }

  /**
   * Verifies user credentials
   */
  public async verifyCredentials (uid: string, password: string): Promise<any> {
    /**
     * Find user or raise exception
     */
    const user = await this.provider.findByUid(uid)
    if (!user) {
      throw CredentialsVerficationException.invalidUid(this.config.provider.uids)
    }

    /**
     * Verify password or raise exception
     */
    const verified = await this.config.provider.verifyPassword(user, password)
    if (!verified) {
      throw CredentialsVerficationException.invalidPassword()
    }

    return user
  }

  /**
   * Verify user credentials and perform login
   */
  public async attempt (uid: string, password: string, remember?: boolean): Promise<any> {
    const user = await this.verifyCredentials(uid, password)
    await this.login(user, remember)
    return user
  }

  /**
   * Login a user
   */
  public async login (user: any, remember?: boolean): Promise<void> {
    /**
     * Update user reference
     */
    this.user = user
    this.setSession(user)

    let token: string | undefined

    /**
     * Set remember me token when enabled
     */
    if (remember) {
      token = this.generateToken(20)
      await this.persistRememberMeToken(user, token)
      this.setRememberMeCookie(user, token)
    } else {
      this.clearRememberMeCookie()
    }

    this.emitter.emit('auth:session:login', this.getLoginEventData(user, token))
    return user
  }

  /**
   * Login user using their id
   */
  public async loginViaId (id: string | number, remember?: boolean): Promise<void> {
    const user = await this.provider.findById(id)
    if (!user) {
      throw CredentialsVerficationException.invalidId(this.config.provider.identifierKey, id)
    }

    await this.login(user, remember)
    return user
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
      this.user = await this.getUserForSessionId(sessionId)
      this.isAuthenticated = true
      this.emitter.emit('auth:session:authenticate', this.getAuthenticateEventData(this.user, false))
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
    this.user = await this.getUserForRememberMeToken(id, token)
    this.isAuthenticated = true
    this.viaRemember = true
    this.emitter.emit('auth:session:authenticate', this.getAuthenticateEventData(this.user, true))

    /**
     * Update the session to re-login the user
     */
    this.setSession(this.user)
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
  }
}
