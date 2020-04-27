/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import test from 'japa'
import supertest from 'supertest'
import { createServer } from 'http'
import cookieParser from 'set-cookie-parser'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import {
  hash,
  setup,
  reset,
  getDb,
  getCtx,
  emitter,
  cleanup,
  getModel,
  unsignCookie,
  decryptCookie,
  encryptCookie,
  getUserModel,
  getSessionDriver,
  getLucidProvider,
  getLucidProviderConfig,
} from '../test-helpers'

let db: DatabaseContract
let BaseModel: ReturnType<typeof getModel>

test.group('Session Driver | Verify Credentials', (group) => {
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
    emitter.clearAllListeners()
  })

  test('raise exception when unable to lookup user', async (assert) => {
    assert.plan(1)

    const User = getUserModel(BaseModel)
    const lucidProvider = getLucidProvider({ model: User })
    const ctx = getCtx()
    const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

    try {
      await sessionDriver.verifyCredentials('virk@adonisjs.com', 'password')
    } catch (error) {
      assert.deepEqual(error.message, 'E_INVALID_AUTH_UID: User not found')
    }
  })

  test('raise exception when password is incorrect', async (assert) => {
    assert.plan(1)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const ctx = getCtx()
    const lucidProvider = getLucidProvider({ model: User })
    const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

    try {
      await sessionDriver.verifyCredentials('virk@adonisjs.com', 'password')
    } catch (error) {
      assert.deepEqual(error.message, 'E_INVALID_AUTH_PASSWORD: Password mis-match')
    }
  })

  test('return user when able to verify credentials', async (assert) => {
    assert.plan(1)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const ctx = getCtx()
    const lucidProvider = getLucidProvider({ model: User })
    const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

    const user = await sessionDriver.verifyCredentials('virk@adonisjs.com', 'secret')
    assert.instanceOf(user, User)
  })
})

test.group('Session Driver | attempt', (group) => {
  group.before(async () => {
    db = await getDb()
    BaseModel = getModel(db)
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    emitter.clearAllListeners()
    await reset(db)
  })

  test('login user by setting the session', async (assert) => {
    assert.plan(4)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })
    emitter.once('auth:session:login', ({ name, user, token }) => {
      assert.equal(name, 'session')
      assert.instanceOf(user, User)
      assert.isNull(token)
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)

      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)
      await sessionDriver.attempt('virk@adonisjs.com', 'secret')
      ctx.response.send({})

      await ctx.session.commit()
      ctx.response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const sessionCookie = unsignCookie(headers['set-cookie'][1], 'adonis-session')
    const sessionValue = decryptCookie(headers['set-cookie'][2], sessionCookie)
    assert.deepEqual(sessionValue, { auth_session: 1 })
  })

  test('define remember me cookie when remember me is set to true', async (assert) => {
    assert.plan(5)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    emitter.once('auth:session:login', ({ name, user: model, token }) => {
      assert.equal(name, 'session')
      assert.instanceOf(model, User)
      assert.exists(token)
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)

      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)
      await sessionDriver.attempt('virk@adonisjs.com', 'secret', true)
      ctx.response.send({})

      await ctx.session.commit()
      ctx.response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const rememberMeCookie = decryptCookie(headers['set-cookie'][0], 'remember_session')
    const sessionCookie = unsignCookie(headers['set-cookie'][1], 'adonis-session')
    const sessionValue = decryptCookie(headers['set-cookie'][2], sessionCookie)

    await user.refresh()

    assert.deepEqual(sessionValue, { auth_session: 1 })
    assert.equal(user.rememberMeToken!, rememberMeCookie.token)
  })

  test('delete remember_me cookie explicitly when login with remember me is false', async (assert) => {
    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)

      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)
      await sessionDriver.attempt('virk@adonisjs.com', 'secret')
      await ctx.session.commit()
      ctx.response.finish()
    })

    const rememberMeToken = encryptCookie('1234', 'remember_session')
    const { headers } = await supertest(server).get('/').set('cookie', `remember_session=${rememberMeToken}`)
    const sessionCookie = unsignCookie(headers['set-cookie'][1], 'adonis-session')
    const sessionValue = decryptCookie(headers['set-cookie'][2], sessionCookie)
    const [key, maxAge, expiry] = headers['set-cookie'][0].split(';')

    assert.equal(expiry.trim(), 'Expires=Thu, 01 Jan 1970 00:00:00 GMT')
    assert.equal(maxAge.trim(), 'Max-Age=-1')
    assert.isTrue(key.startsWith('remember_session='))
    assert.deepEqual(sessionValue, { auth_session: 1 })
  })
})

test.group('Session Driver | authenticate', (group) => {
  group.before(async () => {
    db = await getDb()
    BaseModel = getModel(db)
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    emitter.clearAllListeners()
    await reset(db)
  })

  test('authenticate user session and load user from db', async (assert) => {
    assert.plan(8)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    emitter.once('auth:session:authenticate', ({ name, user, viaRemember }) => {
      assert.equal(name, 'session')
      assert.instanceOf(user, User)
      assert.isFalse(viaRemember)
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      if (req.url === '/login') {
        await sessionDriver.attempt('virk@adonisjs.com', 'secret')
        await ctx.session.commit()
        ctx.response.finish()
      } else {
        await sessionDriver.authenticate()
        ctx.response.send({
          user: sessionDriver.user,
          isAuthenticated: sessionDriver.isAuthenticated,
          viaRemember: sessionDriver.viaRemember,
        })
        await ctx.session.commit()
        ctx.response.finish()
      }
    })

    const { headers } = await supertest(server).get('/login')
    const cookies = cookieParser(headers['set-cookie'])
    const reqCookies = cookies
      .filter((cookie) => cookie.maxAge > 0)
      .map((cookie) => `${cookie.name}=${cookie.value};`)

    const { body } = await supertest(server).get('/').set('cookie', reqCookies)

    assert.equal(body.user.id, 1)
    assert.equal(body.user.username, 'virk')
    assert.equal(body.user.email, 'virk@adonisjs.com')
    assert.isTrue(body.isAuthenticated)
    assert.isFalse(body.viaRemember)
  })

  test('re-login user using remember me token', async (assert) => {
    assert.plan(8)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    emitter.once('auth:session:authenticate', ({ name, user, viaRemember }) => {
      assert.equal(name, 'session')
      assert.instanceOf(user, User)
      assert.isTrue(viaRemember)
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      if (req.url === '/login') {
        await sessionDriver.attempt('virk@adonisjs.com', 'secret', true)
        await ctx.session.commit()
        ctx.response.finish()
      } else {
        await sessionDriver.authenticate()
        ctx.response.send({
          user: sessionDriver.user,
          isAuthenticated: sessionDriver.isAuthenticated,
          viaRemember: sessionDriver.viaRemember,
        })
        await ctx.session.commit()
        ctx.response.finish()
      }
    })

    const { headers } = await supertest(server).get('/login')
    const cookies = cookieParser(headers['set-cookie'])

    const rememberMeCookie = `${cookies[0].name}=${cookies[0].value};`
    const { body } = await supertest(server).get('/').set('cookie', rememberMeCookie)

    assert.equal(body.user.id, 1)
    assert.equal(body.user.username, 'virk')
    assert.equal(body.user.email, 'virk@adonisjs.com')
    assert.isTrue(body.isAuthenticated)
    assert.isTrue(body.viaRemember)
  })

  test('raise exception when unable to authenticate', async (assert) => {
    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    emitter.once('auth:session:authenticate', () => {
      throw new Error('Never expected to reach here')
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      try {
        await sessionDriver.authenticate()
      } catch (error) {
        assert.equal(error.message, 'E_INVALID_AUTH_SESSION: Invalid session')
        assert.equal(error.guard, 'session')
        assert.equal(error.redirectTo, '/login')
      }

      await ctx.session.commit()
      ctx.response.finish()
    })

    await supertest(server).get('/')
  })
})

test.group('Session Driver | logout', (group) => {
  group.before(async () => {
    db = await getDb()
    BaseModel = getModel(db)
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    emitter.clearAllListeners()
    await reset(db)
  })

  test('logout the user by clearing up the session and removing remember_me cookie', async (assert) => {
    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      if (req.url === '/login') {
        await sessionDriver.attempt('virk@adonisjs.com', 'secret', true)
        await ctx.session.commit()
        ctx.response.finish()
      } else {
        await sessionDriver.logout()
        ctx.response.send({
          user: sessionDriver.user,
          isAuthenticated: sessionDriver.isAuthenticated,
          isLoggedOut: sessionDriver.isLoggedOut,
        })
        await ctx.session.commit()
        ctx.response.finish()
      }
    })

    const { headers } = await supertest(server).get('/login')
    await user.refresh()

    const initialToken = user.rememberMeToken
    const cookies = cookieParser(headers['set-cookie'])
    const reqCookies = cookies
      .filter((cookie) => cookie.maxAge > 0)
      .map((cookie) => `${cookie.name}=${cookie.value};`)

    const { body, headers: authHeaders } = await supertest(server).get('/').set('cookie', reqCookies)

    const rememberMeCookie = decryptCookie(authHeaders['set-cookie'][0], 'remember_session')
    const sessionCookie = unsignCookie(authHeaders['set-cookie'][1], 'adonis-session')
    const sessionValue = decryptCookie(authHeaders['set-cookie'][2], sessionCookie)

    assert.isNull(rememberMeCookie)
    assert.deepEqual(sessionValue, {})
    assert.isNull(body.user)
    assert.isFalse(body.isAuthenticated)
    assert.isTrue(body.isLoggedOut)

    await user.refresh()
    assert.equal(user.rememberMeToken, initialToken)
  })

  test('logout and recycle user remember me token', async (assert) => {
    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      if (req.url === '/login') {
        await sessionDriver.attempt('virk@adonisjs.com', 'secret', true)
        await ctx.session.commit()
        ctx.response.finish()
      } else {
        await sessionDriver.logout(true)
        ctx.response.send({
          user: sessionDriver.user,
          isAuthenticated: sessionDriver.isAuthenticated,
          isLoggedOut: sessionDriver.isLoggedOut,
        })
        await ctx.session.commit()
        ctx.response.finish()
      }
    })

    const { headers } = await supertest(server).get('/login')
    await user.refresh()

    const initialToken = user.rememberMeToken
    const cookies = cookieParser(headers['set-cookie'])
    const reqCookies = cookies
      .filter((cookie) => cookie.maxAge > 0)
      .map((cookie) => `${cookie.name}=${cookie.value};`)

    const { body, headers: authHeaders } = await supertest(server).get('/').set('cookie', reqCookies)

    const rememberMeCookie = decryptCookie(authHeaders['set-cookie'][0], 'remember_session')
    const sessionCookie = unsignCookie(authHeaders['set-cookie'][1], 'adonis-session')
    const sessionValue = decryptCookie(authHeaders['set-cookie'][2], sessionCookie)

    assert.isNull(rememberMeCookie)
    assert.deepEqual(sessionValue, {})
    assert.isNull(body.user)
    assert.isFalse(body.isAuthenticated)
    assert.isTrue(body.isLoggedOut)

    await user.refresh()
    assert.notEqual(user.rememberMeToken, initialToken)
  })
})
