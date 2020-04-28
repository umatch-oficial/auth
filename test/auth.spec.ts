/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import test from 'japa'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'

import { AuthManager } from '../src/AuthManager'
import { SessionGuard } from '../src/Guards/Session'
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

test.group('Auth', (group) => {
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

  test('make and cache instance of the session guard', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {
          driver: 'session',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          provider: getDatabaseProviderConfig(),
        },
      },
    })

    const ctx = getCtx()
    const auth = manager.getAuthForRequest(ctx)
    const mapping = auth.use('session')
    mapping['isCached'] = true

    assert.equal(auth.use('session')['isCached'], true)
    assert.instanceOf(mapping, SessionGuard)
    assert.instanceOf(mapping.provider, LucidProvider)
  })

  test('proxy method to the default driver', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {
          driver: 'session',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          provider: getDatabaseProviderConfig(),
        },
      },
    })

    const ctx = getCtx()
    const auth = manager.getAuthForRequest(ctx)

    assert.equal(auth.name, 'session')
    assert.instanceOf(auth.provider, LucidProvider)
  })

  test('update default guard', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {
          driver: 'session',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          provider: getDatabaseProviderConfig(),
        },
      },
    })

    const ctx = getCtx()
    const auth = manager.getAuthForRequest(ctx)
    auth.defaultGuard = 'sessionDb'

    assert.equal(auth.name, 'sessionDb')
    assert.instanceOf(auth.provider, DatabaseProvider)
  })

  test('serialize toJSON', (assert) => {
    const User = getUserModel(BaseModel)

    const manager = new AuthManager(container, {
      guard: 'session',
      list: {
        session: {
          driver: 'session',
          provider: getLucidProviderConfig({ model: User }),
        },
        sessionDb: {
          driver: 'session',
          provider: getDatabaseProviderConfig(),
        },
      },
    })

    const ctx = getCtx()
    const auth = manager.getAuthForRequest(ctx)
    auth.defaultGuard = 'sessionDb'
    auth.use()

    assert.deepEqual(auth.toJSON(), {
      defaultGuard: 'sessionDb',
      guards: {
        sessionDb: {
          isLoggedIn: false,
          isGuest: true,
          viaRemember: false,
          user: undefined,
          authenticationAttempted: false,
          isAuthenticated: false,
        },
      },
    })
  })
})
