/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import { Hooks } from '@poppinss/hooks'
import { Exception } from '@poppinss/utils'
import { IocContract } from '@adonisjs/fold'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

import {
  DatabaseProviderUser,
  DatabaseProviderConfig,
  AuthenticatableContract,
  DatabaseProviderContract,
} from '@ioc:Adonis/Addons/Auth'

/**
 * Database provider to lookup users
 */
export class DatabaseProvider implements DatabaseProviderContract<DatabaseProviderUser> {
  /**
   * Hooks reference
   */
  private hooks = new Hooks()

  /**
   * Custom connection or query client
   */
  private connection?: string | QueryClientContract

  constructor (
    private container: IocContract,
    private config: DatabaseProviderConfig,
    private db: DatabaseContract,
  ) {
  }

  /**
   * Returns the query client for invoking queries
   */
  private getQueryClient () {
    if (!this.connection) {
      return this.db.connection(this.config.connection)
    }
    return typeof (this.connection) === 'string' ? this.db.connection(this.connection) : this.connection
  }

  /**
   * Returns the query builder instance for the users table
   */
  private getUserQueryBuilder () {
    return this.getQueryClient().from(this.config.usersTable)
  }

  /**
   * Ensure "user.id" is always present
   */
  private ensureUserHasId (user: any): asserts user is DatabaseProviderUser {
    if (!user[this.config.identifierKey]) {
      throw new Exception(
        `Auth database provider expects "${this.config.usersTable}.${this.config.identifierKey}" to always exist`,
      )
    }
  }

  /**
   * Define custom connection
   */
  public setConnection (connection: string | QueryClientContract): this {
    this.connection = connection
    return this
  }

  /**
   * Define before hooks. Check interface for exact type information
   */
  public before (event: string, callback: (query: any) => Promise<void>): this {
    this.hooks.add('before', event, callback)
    return this
  }

  /**
   * Define after hooks. Check interface for exact type information
   */
  public after (event: string, callback: (...args: any[]) => Promise<void>): this {
    this.hooks.add('after', event, callback)
    return this
  }

  /**
   * Returns the user row using the primary key
   */
  public async findById (id: string | number) {
    const query = this.getUserQueryBuilder()
    await this.hooks.exec('before', 'findUser', query)

    const user = await query.where(this.config.identifierKey, id).first()
    if (user) {
      this.ensureUserHasId(user)
      await this.hooks.exec('after', 'findUser', user)
    }

    return this.container.make(this.config.authenticatable as any, [user, this.config])
  }

  /**
   * Returns a user row using a specific token type and value
   */
  public async findByToken (id: number | string, token: string) {
    const query = this.getUserQueryBuilder()
    await this.hooks.exec('before', 'findUser', query)

    const user = await query
      .where(this.config.identifierKey, id)
      .where('remember_me_token', token)
      .first()

    if (user) {
      this.ensureUserHasId(user)
      await this.hooks.exec('after', 'findUser', user)
    }

    return this.container.make(this.config.authenticatable as any, [user, this.config])
  }

  /**
   * Returns the user row by searching the uidValue against
   * their defined uids.
   */
  public async findByUid (uidValue: string) {
    const query = this.getUserQueryBuilder()
    await this.hooks.exec('before', 'findUser', query)

    this.config.uids.forEach((uid) => query.orWhere(uid, uidValue))
    const user = await query.first()

    if (user) {
      this.ensureUserHasId(user)
      await this.hooks.exec('after', 'findUser', user)
    }

    return this.container.make(this.config.authenticatable as any, [user, this.config])
  }

  /**
   * Updates the user remember me token
   */
  public async updateRememberMeToken (user: AuthenticatableContract<DatabaseProviderUser>) {
    await this
      .getUserQueryBuilder()
      .where(this.config.identifierKey, user[this.config.identifierKey])
      .update({
        remember_me_token: user.getRememberMeToken()!,
      })
  }
}
