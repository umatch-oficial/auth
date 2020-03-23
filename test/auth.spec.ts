/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import test from 'japa'
import { DateTime } from 'luxon'
import { HasMany } from '@ioc:Adonis/Lucid/Orm'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'

import { AuthManager } from '../src/AuthManager'
import { SessionDriver } from '../src/Drivers/Session'
import { LucidProvider } from '../src/Providers/Lucid'

import {
  setup,
  reset,
  getDb,
  getCtx,
  cleanup,
  container,
  getModel,
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

  test('make and cache instance of the session authenticator', (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public expiresOn: DateTime
      public isRevoked: boolean
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
      public expiresOn: DateTime
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})
    User.$addRelation('tokens', 'hasMany', {
      relatedModel: () => Token,
    })

    Token.boot()
    Token.$addColumn('userId', {})
    Token.$addColumn('value', { columnName: 'token_value' })
    Token.$addColumn('type', { columnName: 'token_type' })
    Token.$addColumn('isRevoked', { columnName: 'is_revoked' })

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
    const mapping = auth.use('session')
    mapping['isCached'] = true

    assert.equal(auth.use('session')['isCached'], true)
    assert.instanceOf(mapping, SessionDriver)
    assert.instanceOf(mapping.provider, LucidProvider)
  })
})
