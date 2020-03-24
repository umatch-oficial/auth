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
      session: {
        driver: 'session',
        provider: getLucidProviderConfig({ model: User }),
      },
      sessionDb: {
        driver: 'session',
        provider: getDatabaseProviderConfig(),
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
})
