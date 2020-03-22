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
import { getDatabaseProvider, getDb, cleanup, setup, reset } from '../test-helpers'

let db: DatabaseContract

test.group('Database Provider | findById', (group) => {
  group.before(async () => {
    db = await getDb()
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

    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    const dbProvider = getDatabaseProvider({})

    dbProvider.before('findUser', async (query) => {
      assert.exists(query)
    })

    dbProvider.after('findUser', async (user) => {
      assert.equal(user.username, 'virk')
      assert.equal(user.email, 'virk@adonisjs.com')
    })

    const providerUser = await dbProvider.findById('1')
    assert.equal(providerUser!.username, 'virk')
    assert.equal(providerUser!.email, 'virk@adonisjs.com')
  })

  test('return null when unable to find the user', async (assert) => {
    assert.plan(2)

    const dbProvider = getDatabaseProvider({})
    dbProvider.before('findUser', async (query) => {
      assert.exists(query)
    })

    dbProvider.after('findUser', async () => {
      throw new Error('not expected to be called')
    })

    const providerUser = await dbProvider.findById('1')
    assert.isNull(providerUser)
  })

  test('use custom connection', async (assert) => {
    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection('secondary')
    const providerUser = await dbProvider.findById('1')

    assert.isNull(providerUser)
  })

  test('use custom query client', async (assert) => {
    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection(db.connection('secondary'))
    const providerUser = await dbProvider.findById('1')

    assert.isNull(providerUser)
  })
})

test.group('Database Provider | findByUids', (group) => {
  group.before(async () => {
    db = await getDb()
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    await reset(db)
  })

  test('find a user using one of the uids', async (assert) => {
    assert.plan(10)

    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const dbProvider = getDatabaseProvider({})
    dbProvider.before('findUser', async (query) => {
      assert.exists(query)
    })

    dbProvider.after('findUser', async (user) => {
      assert.property(user, 'username')
      assert.property(user, 'email')
    })

    const providerUser = await dbProvider.findByUid('virk')
    const providerUser1 = await dbProvider.findByUid('nikk@adonisjs.com')

    assert.equal(providerUser!.username, 'virk')
    assert.equal(providerUser!.email, 'virk@adonisjs.com')

    assert.equal(providerUser1!.username, 'nikk')
    assert.equal(providerUser1!.email, 'nikk@adonisjs.com')
  })

  test('return null when unable to lookup user using uids', async (assert) => {
    assert.plan(4)

    const dbProvider = getDatabaseProvider({})
    dbProvider.before('findUser', async (query) => {
      assert.exists(query)
    })

    dbProvider.after('findUser', async () => {
      throw new Error('not expected to be called')
    })

    const providerUser = await dbProvider.findByUid('virk')
    const providerUser1 = await dbProvider.findByUid('virk@adonisjs.com')

    assert.isNull(providerUser)
    assert.isNull(providerUser1)
  })

  test('use custom connection', async (assert) => {
    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection('secondary')

    const providerUser = await dbProvider.findByUid('virk')
    const providerUser1 = await dbProvider.findByUid('nikk@adonisjs.com')

    assert.isNull(providerUser)
    assert.isNull(providerUser1)
  })

  test('use custom query client', async (assert) => {
    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection(db.connection('secondary'))

    const providerUser = await dbProvider.findByUid('virk')
    const providerUser1 = await dbProvider.findByUid('nikk@adonisjs.com')

    assert.isNull(providerUser)
    assert.isNull(providerUser1)
  })
})

test.group('Database Provider | findByToken', (group) => {
  group.before(async () => {
    db = await getDb()
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

    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    await db.table('tokens').insert({
      user_id: 1,
      token_value: '123',
      token_type: 'remember_me',
      is_revoked: false,
    })
    await db.table('tokens').insert({
      user_id: 2,
      token_value: '456',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    dbProvider.before('findUser', async (query) => {
      assert.exists(query)
    })

    dbProvider.after('findUser', async (user) => {
      assert.equal(user.username, 'virk')
      assert.equal(user.email, 'virk@adonisjs.com')
    })

    const providerUser = await dbProvider.findByToken(1, '123', 'remember_me')

    assert.equal(providerUser!.username, 'virk')
    assert.equal(providerUser!.email, 'virk@adonisjs.com')
  })

  test('return null when token has been revoked', async (assert) => {
    assert.plan(2)

    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    await db.table('tokens').insert({
      user_id: 1,
      token_value: '123',
      token_type: 'remember_me',
      is_revoked: true,
    })
    await db.table('tokens').insert({
      user_id: 2,
      token_value: '456',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    dbProvider.before('findUser', async (query) => {
      assert.exists(query)
    })

    dbProvider.after('findUser', async () => {
      throw new Error('not expected to be called')
    })

    const providerUser = await dbProvider.findByToken(1, '123', 'remember_me')
    assert.isNull(providerUser)
  })

  test('return null when token is missing', async (assert) => {
    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    await db.table('tokens').insert({
      user_id: 2,
      token_value: '456',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    const providerUser = await dbProvider.findByToken(2, '123', 'remember_me')

    assert.isNull(providerUser)
  })

  test('return null when token exists but user is missing', async (assert) => {
    await db.table('tokens').insert({
      user_id: 1,
      token_value: '123',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    const providerUser = await dbProvider.findByToken(1, '123', 'remember_me')

    assert.isNull(providerUser)
  })

  test('use custom connection', async (assert) => {
    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    await db.table('tokens').insert({
      user_id: 1,
      token_value: '123',
      token_type: 'remember_me',
      is_revoked: false,
    })
    await db.table('tokens').insert({
      user_id: 2,
      token_value: '456',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection('secondary')

    const providerUser = await dbProvider.findByToken(1, '123', 'remember_me')
    assert.isNull(providerUser)
  })

  test('use custom query client', async (assert) => {
    await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    await db.table('tokens').insert({
      user_id: 1,
      token_value: '123',
      token_type: 'remember_me',
      is_revoked: false,
    })
    await db.table('tokens').insert({
      user_id: 2,
      token_value: '456',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection(db.connection('secondary'))

    const providerUser = await dbProvider.findByToken(1, '123', 'remember_me')
    assert.isNull(providerUser)
  })
})

test.group('Database Provider | createToken', (group) => {
  group.before(async () => {
    db = await getDb()
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    await reset(db)
  })

  test('create token for a given user', async (assert) => {
    assert.plan(8)

    const [id] = await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })

    const dbProvider = getDatabaseProvider({})
    dbProvider.after('createToken', async (user, token) => {
      assert.equal(user.username, 'virk')
      assert.equal(token.token_value, '1032030303')
      assert.equal(token.token_type, 'remember_me')
    })

    await dbProvider.createToken({ id: id, username: 'virk' }, '1032030303', 'remember_me')

    const tokens = await db.from('tokens')
    assert.lengthOf(tokens, 1)
    assert.equal(tokens[0].user_id, id)
    assert.equal(tokens[0].token_type, 'remember_me')
    assert.equal(tokens[0].token_value, '1032030303')
    assert.isFalse(!!tokens[0].is_revoked)
  })

  test('use custom connection', async (assert) => {
    const [id] = await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection('secondary')
    await dbProvider.createToken({ id: id }, '1032030303', 'remember_me')

    const tokens = await db.connection('secondary').from('tokens')
    assert.lengthOf(tokens, 1)
    assert.equal(tokens[0].user_id, id)
    assert.equal(tokens[0].token_type, 'remember_me')
    assert.equal(tokens[0].token_value, '1032030303')
    assert.isFalse(!!tokens[0].is_revoked)
  })

  test('use custom client', async (assert) => {
    const [id] = await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection(db.connection('secondary'))

    await dbProvider.createToken({ id: id }, '1032030303', 'remember_me')
    const tokens = await db.connection('secondary').from('tokens')

    assert.lengthOf(tokens, 1)
    assert.equal(tokens[0].user_id, id)
    assert.equal(tokens[0].token_type, 'remember_me')
    assert.equal(tokens[0].token_value, '1032030303')
    assert.isFalse(!!tokens[0].is_revoked)
  })
})

test.group('Database Provider | revokeToken', (group) => {
  group.before(async () => {
    db = await getDb()
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    await reset(db)
  })

  test('revoke token for a given user', async (assert) => {
    assert.plan(8)

    const [id] = await db.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    const [id1] = await db.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    await db.table('tokens').insert({
      user_id: id,
      token_value: '123',
      token_type: 'remember_me',
      is_revoked: false,
    })

    await db.table('tokens').insert({
      user_id: id,
      token_value: '123',
      token_type: 'jwt',
      is_revoked: false,
    })

    await db.table('tokens').insert({
      user_id: id,
      token_value: '456',
      token_type: 'remember_me',
      is_revoked: false,
    })

    await db.table('tokens').insert({
      user_id: id1,
      token_value: '678',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    dbProvider.after('revokeToken', async (user, token, type) => {
      assert.equal(user.username, 'virk')
      assert.equal(token, '123')
      assert.equal(type, 'remember_me')
    })

    await dbProvider.revokeToken({ id: id, username: 'virk' }, '123', 'remember_me')

    const tokens = await db.from('tokens').orderBy('id', 'asc')
    assert.lengthOf(tokens, 4)
    assert.isTrue(!!tokens[0].is_revoked)
    assert.isFalse(!!tokens[1].is_revoked)
    assert.isFalse(!!tokens[2].is_revoked)
    assert.isFalse(!!tokens[3].is_revoked)
  })

  test('use custom connection', async (assert) => {
    const client = db.connection('secondary')

    const [id] = await client.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    const [id1] = await client.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    await client.table('tokens').insert({
      user_id: id,
      token_value: '123',
      token_type: 'remember_me',
      is_revoked: false,
    })

    await client.table('tokens').insert({
      user_id: id,
      token_value: '123',
      token_type: 'jwt',
      is_revoked: false,
    })

    await client.table('tokens').insert({
      user_id: id,
      token_value: '456',
      token_type: 'remember_me',
      is_revoked: false,
    })

    await client.table('tokens').insert({
      user_id: id1,
      token_value: '678',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection('secondary')

    await dbProvider.revokeToken({ id: id }, '123', 'remember_me')

    const tokens = await client.from('tokens').orderBy('id', 'asc')
    assert.lengthOf(tokens, 4)
    assert.isTrue(!!tokens[0].is_revoked)
    assert.isFalse(!!tokens[1].is_revoked)
    assert.isFalse(!!tokens[2].is_revoked)
    assert.isFalse(!!tokens[3].is_revoked)
  })

  test('use custom query client', async (assert) => {
    const client = db.connection('secondary')

    const [id] = await client.table('users').insert({ username: 'virk', email: 'virk@adonisjs.com' })
    const [id1] = await client.table('users').insert({ username: 'nikk', email: 'nikk@adonisjs.com' })

    await client.table('tokens').insert({
      user_id: id,
      token_value: '123',
      token_type: 'remember_me',
      is_revoked: false,
    })

    await client.table('tokens').insert({
      user_id: id,
      token_value: '123',
      token_type: 'jwt',
      is_revoked: false,
    })

    await client.table('tokens').insert({
      user_id: id,
      token_value: '456',
      token_type: 'remember_me',
      is_revoked: false,
    })

    await client.table('tokens').insert({
      user_id: id1,
      token_value: '678',
      token_type: 'remember_me',
      is_revoked: false,
    })

    const dbProvider = getDatabaseProvider({})
    dbProvider.setConnection(client)
    await dbProvider.revokeToken({ id: id }, '123', 'remember_me')

    const tokens = await client.from('tokens').orderBy('id', 'asc')
    assert.lengthOf(tokens, 4)
    assert.isTrue(!!tokens[0].is_revoked)
    assert.isFalse(!!tokens[1].is_revoked)
    assert.isFalse(!!tokens[2].is_revoked)
    assert.isFalse(!!tokens[3].is_revoked)
  })
})
