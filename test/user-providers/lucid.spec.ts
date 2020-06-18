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
import {
  getDb,
  setup,
  reset,
  cleanup,
  getModel,
  getUserModel,
  getLucidProvider,
} from '../../test-helpers'

let db: DatabaseContract
let BaseModel: ReturnType<typeof getModel>

test.group('Lucid Provider | findById', (group) => {
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

  test('find a user using the id', async (assert) => {
    assert.plan(5)

    const User = getUserModel(BaseModel)
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => assert.exists(query))
    lucidProvider.after('findUser', async (model) => assert.instanceOf(model, User))

    const providerUser = await lucidProvider.findById(user.id)

    assert.instanceOf(providerUser.user, User)
    assert.equal(providerUser.user!.username, 'virk')
    assert.equal(providerUser.user!.email, 'virk@adonisjs.com')
  })

  test('return null when unable to lookup using id', async (assert) => {
    assert.plan(2)

    const User = getUserModel(BaseModel)

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => assert.exists(query))
    lucidProvider.after('findUser', async () => {
      throw new Error('not expected to be invoked')
    })

    const providerUser = await lucidProvider.findById(1)
    assert.isNull(providerUser.user)
  })

  test('use custom connection', async (assert) => {
    const User = getUserModel(BaseModel)
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection('secondary')

    const providerUser = await lucidProvider.findById(user.id)
    assert.isNull(providerUser.user)
  })

  test('use custom query client', async (assert) => {
    const User = getUserModel(BaseModel)
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection(db.connection('secondary'))

    const providerUser = await lucidProvider.findById(user.id)
    assert.isNull(providerUser.user)
  })
})

test.group('Lucid Provider | findByUids', (group) => {
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

  test('find a user using one of the uids', async (assert) => {
    assert.plan(9)

    const User = getUserModel(BaseModel)
    await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => assert.exists(query))
    lucidProvider.after('findUser', async (user) => assert.instanceOf(user, User))

    const providerUser = await lucidProvider.findByUid('virk')
    const providerUser1 = await lucidProvider.findByUid('nikk@adonisjs.com')

    assert.instanceOf(providerUser.user, User)
    assert.equal(providerUser.user!.username, 'virk')
    assert.equal(providerUser.user!.email, 'virk@adonisjs.com')

    assert.equal(providerUser1.user!.username, 'nikk')
    assert.equal(providerUser1.user!.email, 'nikk@adonisjs.com')
  })

  test('return null when unable to lookup user using uid', async (assert) => {
    assert.plan(4)

    const User = getUserModel(BaseModel)
    const lucidProvider = getLucidProvider({ model: User })

    lucidProvider.before('findUser', async (query) => assert.exists(query))
    lucidProvider.after('findUser', async () => {
      throw new Error('not expected to be invoked')
    })

    const providerUser = await lucidProvider.findByUid('virk')
    const providerUser1 = await lucidProvider.findByUid('virk@adonisjs.com')
    assert.isNull(providerUser.user)
    assert.isNull(providerUser1.user)
  })

  test('use custom connection', async (assert) => {
    const User = getUserModel(BaseModel)
    await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection('secondary')

    const providerUser = await lucidProvider.findByUid('nikk')
    const providerUser1 = await lucidProvider.findByUid('nikk@adonisjs.com')

    assert.isNull(providerUser.user)
    assert.isNull(providerUser1.user)
  })

  test('use custom query client', async (assert) => {
    const User = getUserModel(BaseModel)
    await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection(db.connection('secondary'))

    const providerUser = await lucidProvider.findByUid('nikk')
    const providerUser1 = await lucidProvider.findByUid('nikk@adonisjs.com')
    assert.isNull(providerUser.user)
    assert.isNull(providerUser1.user)
  })
})

test.group('Lucid Provider | findByRememberMeToken', (group) => {
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

  test('find a user using a token', async (assert) => {
    assert.plan(5)

    const User = getUserModel(BaseModel)
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', rememberMeToken: '123' })
    await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => assert.exists(query))
    lucidProvider.after('findUser', async (model) => assert.instanceOf(model, User))

    const providerUser = await lucidProvider.findByRememberMeToken(user.id, '123')
    assert.instanceOf(providerUser.user, User)
    assert.equal(providerUser.user!.username, 'virk')
    assert.equal(providerUser.user!.email, 'virk@adonisjs.com')
  })

  test('return null when user doesn\'t exists', async (assert) => {
    const User = getUserModel(BaseModel)
    const lucidProvider = getLucidProvider({ model: User })
    const providerUser = await lucidProvider.findByRememberMeToken(1, '123')
    assert.isNull(providerUser.user)
  })

  test('return null when users exists but token is missing', async (assert) => {
    assert.plan(2)

    const User = getUserModel(BaseModel)

    const user = await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', rememberMeToken: '123' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => assert.exists(query))
    lucidProvider.after('findUser', async () => {
      throw new Error('not expected to be invoked')
    })

    const providerUser = await lucidProvider.findByRememberMeToken(user.id, '123')
    assert.isNull(providerUser.user)
  })

  test('use custom connection', async (assert) => {
    const User = getUserModel(BaseModel)
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', rememberMeToken: '123' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection('secondary')

    const providerUser = await lucidProvider.findByRememberMeToken(user.id, '123')
    assert.isNull(providerUser.user)
  })

  test('use custom query client', async (assert) => {
    const User = getUserModel(BaseModel)
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', rememberMeToken: '123' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection(db.connection('secondary'))

    const providerUser = await lucidProvider.findByRememberMeToken(user.id, '123')
    assert.isNull(providerUser.user)
  })
})
