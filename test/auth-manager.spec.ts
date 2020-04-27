/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import test from 'japa'
import 'reflect-metadata'
import { ProviderContract } from '@ioc:Adonis/Addons/Auth'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'

import { Auth } from '../src/Auth'
import { AuthManager } from '../src/AuthManager'
import { LucidProvider } from '../src/Providers/Lucid'
import { DatabaseProvider } from '../src/Providers/Database'
import { SessionGuard } from '../src/Guards/Session'

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

  test('make an instance of the session guard with lucid provider', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {
          driver: 'session',
          loginRoute: '/login',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          loginRoute: '/login',
          provider: getDatabaseProviderConfig(),
        },
      },
    })

    const ctx = getCtx()

    const mapping = manager.makeMapping(ctx, 'session')
    assert.instanceOf(mapping, SessionGuard)
    assert.instanceOf(mapping.provider, LucidProvider)
  })

  test('make an instance of the session guard with database provider', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {
          driver: 'session',
          loginRoute: '/login',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          loginRoute: '/login',
          provider: getDatabaseProviderConfig(),
        },
      },
    })

    const ctx = getCtx()

    const mapping = manager.makeMapping(ctx, 'sessionDb')
    assert.instanceOf(mapping, SessionGuard)
    assert.instanceOf(mapping.provider, DatabaseProvider)
  })

  test('make an instance of auth class for a given http request', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {
          driver: 'session',
          loginRoute: '/login',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          loginRoute: '/login',
          provider: getDatabaseProviderConfig(),
        },
      },
    })

    const ctx = getCtx()

    const auth = manager.getAuthForRequest(ctx)
    assert.instanceOf(auth, Auth)
  })

  test('extend by adding custom provider', (assert) => {
    class MongoDBProvider implements ProviderContract<any> {
      constructor (config: any) {
        assert.deepEqual(config, { driver: 'mongodb' })
      }

      public getUserFor (): any {}
      public async findById (): Promise<any> {}
      public async findByToken (): Promise<any> {}
      public async findByUid (): Promise<any> {}
      public async updateRememberMeToken () {}
    }

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {},
        admin: {
          driver: 'session',
          provider: {
            driver: 'mongodb',
          },
        },
      },
    } as any)

    manager.extend('provider', 'mongodb', (_, config) => {
      return new MongoDBProvider(config)
    })

    const ctx = getCtx()
    assert.instanceOf(manager.makeMapping(ctx, 'admin' as any).provider, MongoDBProvider)
  })

  test('extend by adding custom guard', (assert) => {
    class MongoDBProvider implements ProviderContract<any> {
      constructor (config: any) {
        assert.deepEqual(config, { driver: 'mongodb' })
      }

      public getUserFor (): any {}
      public async findById (): Promise<any> {}
      public async findByToken (): Promise<any> {}
      public async findByUid (): Promise<any> {}
      public async updateRememberMeToken () {}
    }

    class CustomGuard {
      constructor (mapping: string, config: any, public provider: any) {
        assert.equal(mapping, 'admin')
        assert.deepEqual(config, { driver: 'google', provider: { driver: 'mongodb' } })
      }
    }

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {},
        admin: {
          driver: 'google',
          provider: {
            driver: 'mongodb',
          },
        },
      },
    } as any)

    manager.extend('provider', 'mongodb', (_, config) => {
      return new MongoDBProvider(config)
    })

    manager.extend('guard', 'google', (_, mapping, config, provider) => {
      return new CustomGuard(mapping, config, provider) as any
    })

    const ctx = getCtx()
    assert.instanceOf(manager.makeMapping(ctx, 'admin' as any), CustomGuard)
    assert.instanceOf(manager.makeMapping(ctx, 'admin' as any).provider, MongoDBProvider)
  })
})
