/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Addons/Auth' {
  import { HasMany } from '@ioc:Adonis/Lucid/Orm'
  import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
  import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
  import { DatabaseQueryBuilderContract } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
  import { ModelContract, ModelConstructorContract, ModelQueryBuilderContract } from '@ioc:Adonis/Lucid/Model'

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  /**
   * Unwrap promise
   */
  type UnwrapPromise<T> = T extends PromiseLike<infer PT> ? PT : never

  /**
   * Returns provider user by excluding null from it
   */
  export type GetProviderUser<Provider extends keyof ProvidersList> = Exclude<UnwrapPromise<
    ReturnType<ProvidersList[Provider]['implementation']['findByUid']>
  >, null>

  /*
  |--------------------------------------------------------------------------
  | Providers
  |--------------------------------------------------------------------------
  */

  /**
   * The interface that every provider must implement
   */
  export interface ProvidersContract<User extends any> {
    /**
     * Find a user using the primary key value
     */
    findById (id: string | number): Promise<User | null>,

    /**
     * Find a user by searching for their uids
     */
    findByUid (uid: string): Promise<User | null>,

    /**
     * Find a user using a token
     */
    findByToken (userId: string | number, value: string, type: string): Promise<User | null>,

    /**
     * Create token for a given user
     */
    createToken (user: User, value: string, type: string): Promise<void>

    /**
     * Create token for a given user
     */
    revokeToken (user: User, value: string, type: string): Promise<void>
  }

  /**
   * The shape of the user model accepted by the Lucid provider
   */
  export type LucidProviderUser = ModelConstructorContract<ModelContract & {
    password: string,
    tokens: HasMany<ModelContract & {
      value: string,
      type: string,
      userId: string | number,
      isRevoked: boolean,
    }>,
  }>

  /**
   * Lucid provider
   */
  export interface LucidProviderContract<
    User extends LucidProviderUser
  > extends ProvidersContract<InstanceType<User>> {
    /**
     * Define a custom connection for all the provider queries
     */
    setConnection (connection: string | QueryClientContract): this

    /**
     * Before hooks
     */
    before (
      event: 'findUser',
      callback: (query: ModelQueryBuilderContract<User>) => Promise<void>,
    ): this

    /**
     * After hooks
     */
    after (
      event: 'findUser',
      callback: (user: InstanceType<User>) => Promise<void>,
    ): this
    after (
      event: 'createToken',
      callback: (user: User, token: InstanceType<User>['tokens'][0]) => Promise<void>,
    ): this
    after (
      event: 'revokeToken',
      callback: (user: User, value: string, type: string) => Promise<void>,
    ): this
  }

  /**
   * Shape of the user returned by the database provider
   */
  export type DatabaseProviderUser = {
    password: string,
    [key: string]: any,
  }

  /**
   * Database provider
   */
  export interface DatabaseProviderContract<
    User extends DatabaseProviderUser
  > extends ProvidersContract<User> {
    /**
     * Define a custom connection for all the provider queries
     */
    setConnection (connection: string | QueryClientContract): this

    /**
     * Before hooks
     */
    before (
      event: 'findUser',
      callback: (query: DatabaseQueryBuilderContract) => Promise<void>,
    ): this

    /**
     * After hooks
     */
    after (
      event: 'findUser',
      callback: (user: DatabaseProviderUser) => Promise<void>,
    ): this
    after (
      event: 'createToken',
      callback: (user: DatabaseProviderUser, token: any) => Promise<void>,
    ): this
    after (
      event: 'revokeToken',
      callback: (user: DatabaseProviderUser, value: string, type: string) => Promise<void>,
    ): this
  }

  /*
  |--------------------------------------------------------------------------
  | Config
  |--------------------------------------------------------------------------
  */

  /**
   * The config accepted by the Lucid provider
   */
  export type LucidProviderConfig<User extends LucidProviderUser> = {
    driver: 'lucid',
    connection?: string,
    uids: string[],
    identifierKey: string,
    verifyPassword: (user: InstanceType<User>, plainPassword: string) => Promise<boolean>
    model: User,
  }

  /**
   * The config accepted by the Database provider
   */
  export type DatabaseProviderConfig = {
    driver: 'database',
    connection?: string,
    uids: string[],
    identifierKey: string,
    verifyPassword: (user: DatabaseProviderUser, plainPassword: string) => Promise<boolean>,

    /**
     * Since there is no model, one need to define these values.
     */
    usersTable: string,
    tokensTable: string,
  }

  /**
   * Shape of session driver config.
   */
  export type SessionDriverConfig<Provider extends keyof ProvidersList> = {
    driver: 'session',
    identifier?: string,
    provider: ProvidersList[Provider]['config'],
  }

  /**
   * Shape of config accepted by the Auth module. It relies on the authenticator
   * list interface
   */
  export interface AuthConfig {
    authenticator: keyof AuthenticatorsList,
    authenticators: { [P in keyof AuthenticatorsList]: AuthenticatorsList[P]['config'] },
  }

  /*
  |--------------------------------------------------------------------------
  | Drivers
  |--------------------------------------------------------------------------
  */

  /**
   * Shape of data emitted by the login event
   */
  export type SessionLoginEventData<Provider extends keyof ProvidersList> = [
    string, GetProviderUser<Provider>, HttpContextContract, string?,
  ]

  /**
   * Shape of the session driver
   */
  export interface SessionDriverContract<Provider extends keyof ProvidersList> {
    /**
     * Reference to the logged in user.
     */
    user?: GetProviderUser<Provider>

    /**
     * A boolean to know if user is a guest or not. It is
     * always opposite of [[isLoggedIn]]
     */
    isGuest: boolean

    /**
     * A boolean to know if user is logged in or not
     */
    isLoggedIn: boolean

    /**
     * A boolean to know if user is retrieved by authenticating
     * the current request or not.
     */
    isAuthenticated: boolean

    /**
     * A boolean to know if user is loggedin via remember me token
     * or not.
     */
    viaRemember: boolean

    /**
     * Reference to the provider for looking up the user
     */
    provider: ProvidersList[Provider]['implementation']

    /**
     * Verify user credentials. An Exception is raised when unable
     * to find user or the password is incorrects
     */
    verifyCredentials (uid: string, password: string): Promise<GetProviderUser<Provider>>

    /**
     * Attempt to verify user credentials and set their login session
     * when credentials are correct.
     */
    attempt (uid: string, password: string, remember?: boolean): Promise<GetProviderUser<Provider>>

    /**
     * Login a user without any verification
     */
    login (user: GetProviderUser<Provider>, remember?: boolean): Promise<void>

    /**
     * Login a user using their id
     */
    loginViaId (id: string | number, remember?: boolean): Promise<void>

    /**
     * Attempts to authenticate the user for the current HTTP request. An exception
     * is raised when unable to do so
     */
    authenticate (): Promise<void>

    /**
     * Attempts to authenticate the user for the current HTTP request and supresses
     * exceptions raised by the [[authenticate]] method.
     */
    authenticateSilently (): Promise<void>
  }

  /*
  |--------------------------------------------------------------------------
  | Auth User Land List
  |--------------------------------------------------------------------------
  */

  /**
   * List of providers mappings used by the app. Using declaration
   * merging, one must extend this interface.
   *
   * MUST BE SET IN THE USER LAND.
   *
   * Example:
   *
   * lucid: {
   *   config: LucidProviderConfig<any>,
   *   implementation: LucidProviderContract<any>,
   * }
   *
   */
  export interface ProvidersList {
  }

  /**
   * List of authenticators mappings used by the app. Using declaration
   * merging, one must extend this interface.
   *
   * MUST BE SET IN THE USER LAND.
   *
   * Example:
   *
   * session: {
   *   config: SessionDriverConfig<'lucid'>,
   *   implementation: SessionDriverContract<'lucid'>,
   * }
   *
   */
  export interface AuthenticatorsList {
  }

  /*
  |--------------------------------------------------------------------------
  | Auth Manager
  |--------------------------------------------------------------------------
  */

  /**
   * Shape of the auth manager. We do not use `@poppinss/maanger` here, since in case
   * auth, we need extendible API for both "providers" and "drivers" and poppinss
   * manager cannot handle it
   */
  export interface AuthContract<
    DefaultAuthenticator = AuthenticatorsList[AuthConfig['authenticator']]['implementation'],
    Authenticators = {
      [P in keyof AuthenticatorsList]: AuthenticatorsList[P]['implementation']
    },
  > {
    use (): DefaultAuthenticator
    use<K extends keyof Authenticators> (authenticator: K): Authenticators[K]
  }

  const Auth: AuthContract
  export default Auth
}
