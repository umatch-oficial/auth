/*
* @adonis-auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import 'reflect-metadata'
import { join } from 'path'
import { Ioc } from '@adonisjs/fold'
import { MarkOptional } from 'ts-essentials'
import { Filesystem } from '@poppinss/dev-utils'
import { LucidModel } from '@ioc:Adonis/Lucid/Model'
import { Hash } from '@adonisjs/hash/build/standalone'
import { ServerResponse, IncomingMessage } from 'http'
import { Logger } from '@adonisjs/logger/build/standalone'
import { Database } from '@adonisjs/lucid/build/src/Database'
import { Profiler } from '@adonisjs/profiler/build/standalone'
import { Emitter } from '@adonisjs/events/build/standalone'
import { Adapter } from '@adonisjs/lucid/build/src/Orm/Adapter'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { SessionConfig } from '@ioc:Adonis/Addons/Session'
import { Encryption } from '@adonisjs/encryption/build/standalone'
import { HttpContext, Router } from '@adonisjs/http-server/build/standalone'
import { SessionManager } from '@adonisjs/session/build/src/SessionManager'
import { DatabaseContract, QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { BaseModel as LucidBaseModel } from '@adonisjs/lucid/build/src/Orm/BaseModel'

import { LucidProvider } from '../src/Providers/Lucid'
import { DatabaseProvider } from '../src/Providers/Database'
import { SessionGuard } from '../src/Guards/Session'

import {
  LucidProviderModel,
  LucidProviderConfig,
  LucidProviderContract,
  DatabaseProviderConfig,
  DatabaseProviderContract,
} from '@ioc:Adonis/Addons/Auth'

const fs = new Filesystem(join(__dirname, '__app'))
const logger = new Logger({ enabled: false, level: 'debug', name: 'adonis', prettyPrint: true })
const profiler = new Profiler(__dirname, logger, {})
const sessionConfig: SessionConfig = {
  driver: 'cookie',
  cookieName: 'adonis-session',
  clearWithBrowser: false,
  age: '2h',
  cookie: {
    path: '/',
  },
}

export const container = new Ioc()
export const secret = 'securelong32characterslongsecret'
export const encryption = new Encryption({ secret })
export const hash = new Hash(container, {
  default: 'bcrypt' as const,
  list: {
    bcrypt: {
      driver: 'bcrypt',
      rounds: 10,
    },
  },
})

export const emitter = new Emitter(container)
container.singleton('Adonis/Core/Event', () => emitter)
container.singleton('Adonis/Core/Encryption', () => encryption)
container.singleton('Adonis/Core/Hash', () => hash)
container.singleton('Adonis/Core/Config', () => {
  return {
    get () {
      return secret
    },
  }
})

/**
 * Create the users tables
 */
async function createUsersTable (client: QueryClientContract) {
  await client.schema.createTable('users', (table) => {
    table.increments('id').notNullable().primary()
    table.string('username').notNullable().unique()
    table.string('email').notNullable().unique()
    table.string('password')
    table.string('remember_me_token').nullable()
    table.boolean('is_active').notNullable().defaultTo(1)
    table.string('country').notNullable().defaultTo('IN')
  })
}

/**
 * Returns default config for the lucid provider
 */
export function getLucidProviderConfig <User extends LucidProviderModel> (
  config: MarkOptional<LucidProviderConfig<User>, 'driver' | 'uids' | 'identifierKey' | 'user'>,
) {
  const defaults: LucidProviderConfig<User> = {
    driver: 'lucid' as const,
    uids: ['username', 'email' as any],
    model: config.model,
    identifierKey: 'id',
  }
  return defaults
}

/**
 * Returns default config for the database provider
 */
export function getDatabaseProviderConfig () {
  const defaults: DatabaseProviderConfig = {
    driver: 'database' as const,
    uids: ['username', 'email'],
    identifierKey: 'id',
    usersTable: 'users',
  }
  return defaults
}

/**
 * Returns instance of database
 */
export async function getDb () {
  await fs.ensureRoot()

  const db = new Database({
    connection: 'primary',
    connections: {
      primary: {
        client: 'sqlite3',
        connection: {
          filename: join(fs.basePath, 'primary.sqlite3'),
        },
      },
      secondary: {
        client: 'sqlite3',
        connection: {
          filename: join(fs.basePath, 'secondary.sqlite3'),
        },
      },
    },
  }, logger, profiler, emitter) as unknown as DatabaseContract

  container.singleton('Adonis/Lucid/Database', () => db)
  return db
}

/**
 * Performs an initial setup
 */
export async function setup (db: DatabaseContract) {
  await createUsersTable(db.connection())
  await createUsersTable(db.connection('secondary'))

  HttpContext.getter('session', function session () {
    const sessionManager = new SessionManager(container, sessionConfig)
    return sessionManager.create(this)
  }, true)
}

/**
 * Performs cleanup
 */
export async function cleanup (db: DatabaseContract) {
  await db.connection().schema.dropTableIfExists('users')
  await db.connection('secondary').schema.dropTableIfExists('users')
  await db.manager.closeAll()
  await fs.cleanup()
}

/**
 * Reset database tables
 */
export async function reset (db: DatabaseContract) {
  await db.connection().truncate('users')
  await db.connection('secondary').truncate('users')
}

/**
 * Returns Base model that other models can extend
 */
export function getModel (db: DatabaseContract) {
  LucidBaseModel.$adapter = new Adapter(db)
  LucidBaseModel.$container = container
  return LucidBaseModel as unknown as LucidModel
}

/**
 * Returns an instance of the lucid provider
 */
export function getLucidProvider<User extends LucidProviderModel> (
  config: MarkOptional<LucidProviderConfig<User>, 'driver' | 'uids' | 'identifierKey' | 'user'>,
) {
  const defaults = getLucidProviderConfig(config)
  const normalizedConfig = Object.assign(defaults, config) as LucidProviderConfig<User>
  return new LucidProvider(container, normalizedConfig) as unknown as LucidProviderContract<User>
}

/**
 * Returns an instance of the database provider
 */
export function getDatabaseProvider (config: Partial<DatabaseProviderConfig>) {
  const defaults = getDatabaseProviderConfig()
  const normalizedConfig = Object.assign(defaults, config) as DatabaseProviderConfig
  const db = container.use('Adonis/Lucid/Database')
  return new DatabaseProvider(container, normalizedConfig, db) as unknown as DatabaseProviderContract<any>
}

/**
 * Returns an instance of ctx
 */
export function getCtx (req?: IncomingMessage, res?: ServerResponse) {
  const httpRow = profiler.create('http:request')
  const router = new Router(encryption)

  return HttpContext
    .create(
      '/',
      {},
      logger,
      httpRow,
      encryption,
      router,
      req,
      res,
      {} as any,
    ) as unknown as HttpContextContract
}

/**
 * Returns an instance of the session driver.
 */
export function getSessionDriver (
  provider: DatabaseProviderContract<any> | LucidProviderContract<any>,
  providerConfig: DatabaseProviderConfig | LucidProviderConfig<any>,
  ctx: HttpContextContract,
) {
  const config = {
    driver: 'session' as const,
    loginRoute: '/login',
    provider: providerConfig,
  }

  return new SessionGuard('session', config, emitter, provider, ctx)
}

/**
 * Returns the user model
 */
export function getUserModel (BaseModel: LucidModel) {
  const UserModel = class User extends BaseModel {
    public id: number
    public username: string
    public password: string
    public email: string
    public rememberMeToken: string
  }

  UserModel.boot()
  UserModel.$addColumn('id', { isPrimary: true })
  UserModel.$addColumn('username', {})
  UserModel.$addColumn('email', {})
  UserModel.$addColumn('password', {})
  UserModel.$addColumn('rememberMeToken', {})

  return UserModel
}

/**
 * Signs value to be set as cookie header
 */
export function signCookie (value: any, name: string) {
  return `${name}=s:${encryption.verifier.sign(value, undefined, name)}`
}

/**
 * Encrypt value to be set as cookie header
 */
export function encryptCookie (value: any, name: string) {
  return `${name}=e:${encryption.encrypt(value, undefined, name)}`
}

/**
 * Decrypt cookie
 */
export function decryptCookie (cookie: any, name: string) {
  const cookieValue = decodeURIComponent(cookie.split(';')[0])
    .replace(`${name}=`, '')
    .slice(2)

  return encryption.decrypt<any>(cookieValue, name)
}

/**
 * Unsign cookie
 */
export function unsignCookie (cookie: any, name: string) {
  const cookieValue = decodeURIComponent(cookie.split(';')[0])
    .replace(`${name}=`, '')
    .slice(2)

  return encryption.verifier.unsign<any>(cookieValue, name)
}

/**
 * Mocks action on a object
 */
export function mockAction (collection: any, name: string, verifier: any) {
  collection[name] = function (...args: any[]) {
    verifier(...args)
    delete collection[name]
  }
}

/**
 * Mocks property on a object
 */
export function mockProperty (collection: any, name: string, value: any) {
  Object.defineProperty(collection, name, {
    get () {
      delete collection[name]
      return value
    },
    enumerable: true,
    configurable: true,
  })
}
