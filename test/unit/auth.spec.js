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
const { Config } = require('@adonisjs/sink')
const Auth = require('../../src/Auth')
const setup = require('./setup')
const helpers = require('./helpers')
const { session: Session } = require('../../src/Schemes')
const { lucid: Lucid } = require('../../src/Serializers')

test.group('Auth', (group) => {
  setup.hashHook(group)

  test('throw exception when config is missing', (assert) => {
    const auth = () => new Auth({}, new Config())
    assert.throw(auth, 'E_MISSING_CONFIG: auth.undefined is not defined inside config/auth.js file')
  })

  test('throw exception when config values are missing', (assert) => {
    const config = new Config()

    config.set('auth', {
      authenticator: 'session',
      session: {
      }
    })

    const auth = () => new Auth({}, config)
    assert.throw(auth, 'E_MISSING_CONFIG: auth.session is not defined inside config/auth.js file')
  })

  test('throw exception when serializer is not defined', (assert) => {
    const config = new Config()

    config.set('auth', {
      authenticator: 'session',
      session: {
        scheme: 'foo'
      }
    })

    const auth = () => new Auth({}, config)
    assert.throw(auth, 'E_INCOMPLETE_CONFIG: Make sure to define serializer, scheme on auth.session inside config/auth.js')
  })

  test('throw exception when scheme is missing', (assert) => {
    const config = new Config()

    config.set('auth', {
      authenticator: 'session',
      session: {
        serializer: 'foo'
      }
    })

    const auth = () => new Auth({}, config)
    assert.throw(auth, 'E_INCOMPLETE_CONFIG: Make sure to define serializer, scheme on auth.session inside config/auth.js')
  })

  test('return authenticator instance when everything is fine', (assert) => {
    const config = new Config()

    config.set('auth', {
      authenticator: 'session',
      session: {
        serializer: 'lucid',
        scheme: 'session',
        uid: 'email',
        password: 'password'
      }
    })

    const auth = new Auth({}, config)
    const authenticator = auth.authenticator()
    assert.instanceOf(authenticator, Session)
    assert.instanceOf(authenticator._serializerInstance, Lucid)
  })

  test('proxy scheme methods', async (assert) => {
    assert.plan(1)
    const config = new Config()

    config.set('auth', {
      authenticator: 'session',
      session: {
        serializer: 'lucid',
        scheme: 'session',
        uid: 'email',
        model: helpers.getUserModel(),
        password: 'password'
      }
    })

    const auth = new Auth({
      session: { get () {} },
      response: { cookie: function () {} },
      request: { cookie: function () {} }
    }, config)

    try {
      await auth.check()
    } catch ({ message }) {
      assert.equal(message, 'E_MISSING_SESSION: No session found for user')
    }
  })
})
