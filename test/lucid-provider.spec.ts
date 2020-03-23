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
import { getLucidProvider, getDb, cleanup, setup, reset, getModel } from '../test-helpers'

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
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => {
      assert.exists(query)
    })
    lucidProvider.after('findUser', async (user) => {
      assert.instanceOf(user, User)
    })

    const providerUser = await lucidProvider.findById(user.id)

    assert.instanceOf(providerUser, User)
    assert.equal(providerUser!.username, 'virk')
    assert.equal(providerUser!.email, 'virk@adonisjs.com')
  })

  test('return null when unable to lookup using id', async (assert) => {
    assert.plan(2)

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
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => {
      assert.exists(query)
    })
    lucidProvider.after('findUser', async () => {
      throw new Error('not expected to be invoked')
    })

    const providerUser = await lucidProvider.findById(1)

    assert.isNull(providerUser)
  })

  test('use custom connection', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection('secondary')
    const providerUser = await lucidProvider.findById(user.id)

    assert.isNull(providerUser)
  })

  test('use custom query client', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    const client = db.connection('secondary')

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection(client)
    const providerUser = await lucidProvider.findById(user.id)

    assert.isNull(providerUser)
  })
})

test.group('Lucid Provider | findByUIds', (group) => {
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

    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})

    await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => {
      assert.exists(query)
    })
    lucidProvider.after('findUser', async (user) => {
      assert.instanceOf(user, User)
    })

    const providerUser = await lucidProvider.findByUid('virk')
    const providerUser1 = await lucidProvider.findByUid('nikk@adonisjs.com')

    assert.instanceOf(providerUser, User)
    assert.equal(providerUser!.username, 'virk')
    assert.equal(providerUser!.email, 'virk@adonisjs.com')

    assert.equal(providerUser1!.username, 'nikk')
    assert.equal(providerUser1!.email, 'nikk@adonisjs.com')
  })

  test('return null when unable to lookup user using uid', async (assert) => {
    assert.plan(4)

    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => {
      assert.exists(query)
    })
    lucidProvider.after('findUser', async () => {
      throw new Error('not expected to be invoked')
    })

    const providerUser = await lucidProvider.findByUid('virk')
    const providerUser1 = await lucidProvider.findByUid('virk@adonisjs.com')

    assert.isNull(providerUser)
    assert.isNull(providerUser1)
  })

  test('use custom connection', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})

    await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection('secondary')

    const providerUser = await lucidProvider.findByUid('nikk')
    const providerUser1 = await lucidProvider.findByUid('nikk@adonisjs.com')

    assert.isNull(providerUser)
    assert.isNull(providerUser1)
  })

  test('use custom query client', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
      public tokens: HasMany<Token>
    }

    User.boot()
    User.$addColumn('id', { isPrimary: true })
    User.$addColumn('username', {})
    User.$addColumn('email', {})

    await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })
    const client = db.connection('secondary')

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection(client)

    const providerUser = await lucidProvider.findByUid('nikk')
    const providerUser1 = await lucidProvider.findByUid('nikk@adonisjs.com')

    assert.isNull(providerUser)
    assert.isNull(providerUser1)
  })
})

test.group('Lucid Provider | findByToken', (group) => {
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

    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const user1 = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    const user2 = await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })
    await user1.related('tokens').create({ value: '123', type: 'remember_me', isRevoked: false })
    await user2.related('tokens').create({ value: '456', type: 'remember_me', isRevoked: false })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => {
      assert.exists(query)
    })
    lucidProvider.after('findUser', async (user) => {
      assert.instanceOf(user, User)
    })

    const providerUser = await lucidProvider.findByToken(user1.id, {
      value: '123',
      type: 'remember_me',
    })

    assert.instanceOf(providerUser, User)
    assert.equal(providerUser!.username, 'virk')
    assert.equal(providerUser!.email, 'virk@adonisjs.com')
  })

  test('return null when token is revoked', async (assert) => {
    assert.plan(1)

    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const user1 = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    const user2 = await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })
    await user1.related('tokens').create({ value: '123', type: 'remember_me', isRevoked: true })
    await user2.related('tokens').create({ value: '456', type: 'remember_me', isRevoked: false })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async () => {
      throw new Error('not expected to be invoked')
    })
    lucidProvider.after('findUser', async () => {
      throw new Error('not expected to be invoked')
    })

    const providerUser = await lucidProvider.findByToken(user1.id, {
      value: '123',
      type: 'remember_me',
    })
    assert.isNull(providerUser)
  })

  test('return null when token is expired', async (assert) => {
    assert.plan(1)

    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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
    Token.$addColumn('expiresOn', { columnName: 'expires_on' })

    const user1 = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    const user2 = await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })
    await user1.related('tokens').create({
      value: '123',
      type: 'remember_me',
      isRevoked: false,
      expiresOn: DateTime.utc().minus({ days: 10 }).toSQLDate(),
    })
    await user2.related('tokens').create({ value: '456', type: 'remember_me', isRevoked: false })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async () => {
      throw new Error('not expected to be invoked')
    })
    lucidProvider.after('findUser', async () => {
      throw new Error('not expected to be invoked')
    })

    const providerUser = await lucidProvider.findByToken(user1.id, {
      value: '123',
      type: 'remember_me',
    })
    assert.isNull(providerUser)
  })

  test('return null when token is missing', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const lucidProvider = getLucidProvider({ model: User })
    const providerUser = await lucidProvider.findByToken(1, {
      value: '123',
      type: 'remember_me',
    })

    assert.isNull(providerUser)
  })

  test('return null when token exists but user is missing', async (assert) => {
    assert.plan(2)

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

    const user2 = await User.create({ username: 'nikk', email: 'nikk@adonisjs.com' })
    await Token.create({ value: '123', type: 'remember_me', isRevoked: false, userId: 10 })
    await user2.related('tokens').create({ value: '456', type: 'remember_me', isRevoked: false })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.before('findUser', async (query) => {
      assert.exists(query)
    })
    lucidProvider.after('findUser', async () => {
      throw new Error('not expected to be invoked')
    })

    const providerUser = await lucidProvider.findByToken(10, {
      value: '123',
      type: 'remember_me',
    })

    assert.isNull(providerUser)
  })

  test('use custom connection', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const user1 = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    await user1.related('tokens').create({ value: '123', type: 'remember_me', isRevoked: false })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection('secondary')
    const providerUser = await lucidProvider.findByToken(user1.id, {
      value: '123',
      type: 'remember_me',
    })

    assert.isNull(providerUser)
  })

  test('use custom query client', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: string
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const user1 = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    await user1.related('tokens').create({ value: '123', type: 'remember_me', isRevoked: false })
    const client = db.connection('secondary')

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.setConnection(client)
    const providerUser = await lucidProvider.findByToken(user1.id, {
      value: '123',
      type: 'remember_me',
    })

    assert.isNull(providerUser)
  })
})

test.group('Lucid Provider | createToken', (group) => {
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

  test('create token for a given user', async (assert) => {
    assert.plan(7)

    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: number
      public expiresOn: DateTime
      public isRevoked: boolean
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.after('createToken', async (user, token) => {
      assert.instanceOf(user, User)
      assert.instanceOf(token, Token)
    })

    await lucidProvider.createToken(user, {
      value: '1032030303',
      type: 'remember_me',
      expiresOn: DateTime.utc().plus({ years: 5 }),
    })

    const tokens = await Token.all()
    assert.lengthOf(tokens, 1)
    assert.equal(tokens[0].userId, user.id)
    assert.equal(tokens[0].type, 'remember_me')
    assert.equal(tokens[0].value, '1032030303')
    assert.isFalse(!!tokens[0].isRevoked)
  })

  test('create token using a custom connection', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: number
      public expiresOn: DateTime
      public isRevoked: boolean
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' }, {
      connection: 'secondary',
    })
    /**
     * Should inherit connection from user
     */
    const lucidProvider = getLucidProvider({ model: User })
    await lucidProvider.createToken(user, {
      value: '1032030303',
      type: 'remember_me',
      expiresOn: DateTime.utc().plus({ years: 5 }),
    })

    const tokens = await Token.query({ connection: 'secondary' }).orderBy('id', 'desc')
    assert.lengthOf(tokens, 1)
    assert.equal(tokens[0].userId, user.id)
    assert.equal(tokens[0].type, 'remember_me')
    assert.equal(tokens[0].value, '1032030303')
    assert.isFalse(!!tokens[0].isRevoked)
  })
})

test.group('Lucid Provider | revokeToken', (group) => {
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

  test('revoke token for a given user', async (assert) => {
    assert.plan(7)

    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: number
      public expiresOn: DateTime
      public isRevoked: boolean
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    await user.related('tokens').create({ type: 'remember_me', value: '10001021', isRevoked: false })
    await user.related('tokens').create({ type: 'remember_me', value: '900102020', isRevoked: false })
    await user.related('tokens').create({ type: 'jwt', value: '10001021', isRevoked: false })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.after('revokeToken', async (user, token) => {
      assert.instanceOf(user, User)
      assert.equal(token.value, '10001021')
      assert.equal(token.type, 'remember_me')
    })

    await lucidProvider.revokeToken(user, {
      value: '10001021',
      type: 'remember_me',
    })

    const tokens = await Token.all()
    assert.lengthOf(tokens, 3)
    assert.isFalse(!!tokens[0].isRevoked)
    assert.isFalse(!!tokens[1].isRevoked)
    assert.isTrue(!!tokens[2].isRevoked)
  })

  test('use custom connection', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: number
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' }, {
      connection: 'secondary',
    })
    await user.related('tokens').create({ type: 'remember_me', value: '10001021', isRevoked: false })
    await user.related('tokens').create({ type: 'remember_me', value: '900102020', isRevoked: false })
    await user.related('tokens').create({ type: 'jwt', value: '10001021', isRevoked: false })

    const lucidProvider = getLucidProvider({ model: User })

    /**
     * Should inherit connection from user
     */
    await lucidProvider.revokeToken(user, {
      value: '10001021',
      type: 'remember_me',
    })

    const tokens = await Token.query({ connection: 'secondary' }).orderBy('id', 'desc')
    assert.lengthOf(tokens, 3)
    assert.isFalse(!!tokens[0].isRevoked)
    assert.isFalse(!!tokens[1].isRevoked)
    assert.isTrue(!!tokens[2].isRevoked)
  })
})

test.group('Lucid Provider | updateToken', (group) => {
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

  test('update existing token value and expiry', async (assert) => {
    assert.plan(8)

    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: number
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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
    Token.$addColumn('expiresOn', {
      columnName: 'expires_on',
    })

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    await user.related('tokens').create({ type: 'remember_me', value: '10001021', isRevoked: false })
    await user.related('tokens').create({ type: 'remember_me', value: '900102020', isRevoked: false })
    await user.related('tokens').create({ type: 'jwt', value: '10001021', isRevoked: false })

    const lucidProvider = getLucidProvider({ model: User })
    lucidProvider.after('updateToken', async (user, oldValue, token) => {
      assert.instanceOf(user, User)
      assert.equal(oldValue, '900102020')
      assert.equal(token.value, '900102021')
      assert.equal(token.type, 'remember_me')
    })

    const currentDate = DateTime.utc()

    await lucidProvider.updateToken(user, '900102020', {
      value: '900102021',
      type: 'remember_me',
      expiresOn: currentDate,
    })

    const tokens = await Token.all()
    assert.lengthOf(tokens, 3)
    assert.equal(tokens[1].value, '900102021')
    assert.equal(tokens[1].type, 'remember_me')
    assert.equal(tokens[1].expiresOn, currentDate.toSQLDate() as any)
  })
})

test.group('Lucid Provider | purgeTokens', (group) => {
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

  test('purge existing expired tokens', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: number
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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
    Token.$addColumn('expiresOn', { columnName: 'expires_on' })

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    await user.related('tokens').create({
      type: 'remember_me',
      value: '10001021',
      isRevoked: false,
      expiresOn: DateTime.utc().minus({ days: 1 }).toSQLDate(),
    })
    await user.related('tokens').create({ type: 'remember_me', value: '900102020', isRevoked: false })
    await user.related('tokens').create({
      type: 'jwt',
      value: '10001021',
      isRevoked: false,
      expiresOn: DateTime.utc().minus({ days: 1 }).toSQLDate(),
    })

    const lucidProvider = getLucidProvider({ model: User })
    await lucidProvider.purgeTokens(user, 'remember_me')

    const tokens = await Token.all()
    assert.lengthOf(tokens, 2)

    assert.equal(tokens[0].value, '10001021')
    assert.equal(tokens[0].type, 'jwt')
    assert.equal(tokens[1].value, '900102020')
    assert.equal(tokens[1].type, 'remember_me')
  })

  test('purge revoked expired tokens', async (assert) => {
    class Token extends BaseModel {
      public type: string
      public value: string
      public userId: number
      public isRevoked: boolean
      public expiresOn: DateTime
    }

    class User extends BaseModel {
      public id: number
      public username: string
      public password: string
      public email: string
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
    Token.$addColumn('expiresOn', { columnName: 'expires_on' })

    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com' })
    await user.related('tokens').create({
      type: 'remember_me',
      value: '10001021',
      isRevoked: false,
      expiresOn: DateTime.utc().minus({ days: 1 }).toSQLDate(),
    })
    await user.related('tokens').create({ type: 'remember_me', value: '900102020', isRevoked: true })
    await user.related('tokens').create({
      type: 'jwt',
      value: '10001021',
      isRevoked: true,
      expiresOn: DateTime.utc().minus({ days: 1 }).toSQLDate(),
    })

    const lucidProvider = getLucidProvider({ model: User })
    await lucidProvider.purgeTokens(user, 'remember_me')

    const tokens = await Token.all()
    assert.lengthOf(tokens, 1)

    assert.equal(tokens[0].value, '10001021')
    assert.equal(tokens[0].type, 'jwt')
  })
})
