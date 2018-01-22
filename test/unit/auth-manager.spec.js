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
const AuthManager = require('../../src/Auth/Manager')
const { session: Session } = require('../../src/Schemes')
const { lucid: Lucid } = require('../../src/Serializers')
const setup = require('./setup')

test.group('AuthManager', (group) => {
  setup.hashHook(group)

  test('extend by adding a new serializer', (assert) => {
    const mongo = {}
    AuthManager.extend('mongo', mongo, 'serializer')
    assert.deepEqual(AuthManager._serializers, { mongo })
  })

  test('extend by adding a new scheme', (assert) => {
    const api = {}
    AuthManager.extend('api', api, 'scheme')
    assert.deepEqual(AuthManager._schemes, { api })
  })

  test('throw error when type is not a serializer or scheme', (assert) => {
    const api = {}
    const fn = () => AuthManager.extend('api', api, 'foo')
    assert.throw(fn, 'Auth.extend type must be a serializer or scheme')
  })

  test('get instance of scheme', (assert) => {
    const session = AuthManager.getScheme('session')
    assert.instanceOf(session, Session)
  })

  test('get instance of serializer', (assert) => {
    const lucid = AuthManager.getSerializer('lucid')
    assert.instanceOf(lucid, Lucid)
  })

  test('throw exception when scheme is not found', (assert) => {
    const fn = () => AuthManager.getScheme('foo')
    assert.throw(fn, /E_INCOMPLETE_CONFIG: Make sure to define foo scheme on auth inside config\/auth\.js/)
  })

  test('throw exception when serializer is not found', (assert) => {
    const fn = () => AuthManager.getSerializer('foo')
    assert.throw(fn, /E_INCOMPLETE_CONFIG: Make sure to define foo serializer on auth inside config\/auth\.js/)
  })
})
