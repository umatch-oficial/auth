/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import test from 'japa'
import { ProvidersContract } from '@ioc:Adonis/Addons/Auth'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'

import { Auth } from '../src/Auth'
import { AuthManager } from '../src/AuthManager'
import { SessionDriver } from '../src/Drivers/Session'
import { LucidProvider } from '../src/Providers/Lucid'
import { DatabaseProvider } from '../src/Providers/Database'

import {
  setup,
  reset,
  getDb,
  getCtx,
  cleanup,
  container,
  getModel,
  getUserModel,
  getLucidProviderConfig,
  getDatabaseProviderConfig,
} from '../test-helpers'

let db: DatabaseContract
let BaseModel: ReturnType<typeof getModel>

test.group('Auth Manager', (group) => {
  group.before(async () => {
    db = await getDb()
    BaseModel = getModel(db)
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    await reset(db)
  })

  test('make an instance of the session authenticator with lucid provider', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager({
      authenticator: 'session',
      authenticators: {
        session: {
          driver: 'session',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          provider: getDatabaseProviderConfig(),
        },
      },
    }, container)

    const ctx = getCtx()

    const mapping = manager.makeMapping(ctx, 'session')
    assert.instanceOf(mapping, SessionDriver)
    assert.instanceOf(mapping.provider, LucidProvider)
  })

  test('make an instance of the session authenticator with database provider', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager({
      authenticator: 'session',
      authenticators: {
        session: {
          driver: 'session',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          provider: getDatabaseProviderConfig(),
        },
      },
    }, container)

    const ctx = getCtx()

    const mapping = manager.makeMapping(ctx, 'sessionDb')
    assert.instanceOf(mapping, SessionDriver)
    assert.instanceOf(mapping.provider, DatabaseProvider)
  })

  test('make an instance of auth class for a given http request', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager({
      authenticator: 'session',
      authenticators: {
        session: {
          driver: 'session',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          provider: getDatabaseProviderConfig(),
        },
      },
    }, container)

    const ctx = getCtx()

    const auth = manager.getAuthForRequest(ctx)
    assert.instanceOf(auth, Auth)
  })

  test('extend by adding custom provider', (assert) => {
    class MongoDBProvider implements ProvidersContract<any> {
      constructor (config: any) {
        assert.deepEqual(config, { driver: 'mongodb' })
      }

      public async findById (): Promise<any> {}
      public async findByToken (): Promise<any> {}
      public async findByUid (): Promise<any> {}
      public async updateRememberMeToken () {}
    }

    const manager = new AuthManager({
      authenticator: 'session',
      authenticators: {
        admin: {
          driver: 'session',
          provider: {
            driver: 'mongodb',
          },
        },
      } as any,
    }, container)

    manager.extend('provider', 'mongodb', (_, config) => {
      return new MongoDBProvider(config)
    })

    const ctx = getCtx()
    assert.instanceOf(manager.makeMapping(ctx, 'admin' as any).provider, MongoDBProvider)
  })

  test('extend by adding custom authenticator', (assert) => {
    class MongoDBProvider implements ProvidersContract<any> {
      constructor (config: any) {
        assert.deepEqual(config, { driver: 'mongodb' })
      }

      public async findById (): Promise<any> {}
      public async findByToken (): Promise<any> {}
      public async findByUid (): Promise<any> {}
      public async updateRememberMeToken () {}
    }

    class CustomAuthenticator {
      constructor (mapping: string, config: any, public provider: any) {
        assert.equal(mapping, 'admin')
        assert.deepEqual(config, { driver: 'google', provider: { driver: 'mongodb' } })
      }
    }

    const manager = new AuthManager({
      authenticator: 'session',
      authenticators: {
        admin: {
          driver: 'google',
          provider: {
            driver: 'mongodb',
          },
        },
      } as any,
    }, container)

    manager.extend('provider', 'mongodb', (_, config) => {
      return new MongoDBProvider(config)
    })

    manager.extend('authenticator', 'google', (_, mapping, config, __, provider) => {
      return new CustomAuthenticator(mapping, config, provider)
    })

    const ctx = getCtx()
    assert.instanceOf(manager.makeMapping(ctx, 'admin' as any), CustomAuthenticator)
    assert.instanceOf(manager.makeMapping(ctx, 'admin' as any).provider, MongoDBProvider)
  })
})
