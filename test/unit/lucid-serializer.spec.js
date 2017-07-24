'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('@adonisjs/lucid/lib/iocResolver').setFold(require('@adonisjs/fold'))

const test = require('japa')
const { ioc } = require('@adonisjs/fold')

const { lucid: LucidSerializer } = require('../../src/Serializers')
const helpers = require('./helpers')
const setup = require('./setup')

test.group('Serializers - Lucid', (group) => {
  setup.databaseHook(group)
  setup.hashHook(group)

  test('generate correct query to fetch user by id', async (assert) => {
    const User = helpers.getUserModel()
    let authQuery = null
    User.onQuery((query) => (authQuery = query))

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer()
    lucid.setConfig(config)
    await lucid.findById(1)

    assert.equal(authQuery.sql, 'select * from "users" where "id" = ? limit ?')
    assert.deepEqual(authQuery.bindings, [1, 1])
  })

  test('generate correct query to fetch user by uid', async (assert) => {
    const User = helpers.getUserModel()

    let authQuery = null
    User.onQuery((query) => (authQuery = query))

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer()
    lucid.setConfig(config)
    await lucid.findByUid('foo@bar.com')

    assert.equal(authQuery.sql, 'select * from "users" where "email" = ? limit ?')
    assert.deepEqual(authQuery.bindings, ['foo@bar.com', 1])
  })

  test('return false when unable to match password', async (assert) => {
    const User = helpers.getUserModel()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const user = new User()
    user.email = 'foo@bar.com'
    user.password = 'secret'
    await user.save()

    const verified = await lucid.validateCredentails(user, 'foo')
    assert.isFalse(verified)
  })

  test('return false when unable to match password', async (assert) => {
    const User = helpers.getUserModel()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const user = new User()
    user.email = 'foo@bar.com'
    user.password = 'secret'
    await user.save()

    const verified = await lucid.validateCredentails(user, 'foo')
    assert.isFalse(verified)
  })

  test('return true when password matches', async (assert) => {
    const User = helpers.getUserModel()

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    const user = new User()
    user.email = 'foo@bar.com'
    user.password = 'secret'
    await user.save()

    const verified = await lucid.validateCredentails(user, 'secret')
    assert.isTrue(verified)
  })

  test('return add runtime constraints to query builder', async (assert) => {
    const User = helpers.getUserModel()

    let authQuery = null
    User.onQuery((query) => (authQuery = query))

    const config = {
      model: User,
      uid: 'email',
      password: 'password'
    }

    const lucid = new LucidSerializer(ioc.use('Hash'))
    lucid.setConfig(config)

    await lucid.query(function (builder) {
      builder.where('is_active', true)
    }).findById(1)

    assert.equal(authQuery.sql, 'select * from "users" where "is_active" = ? and "id" = ? limit ?')
  })
})
