/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { createServer } from 'http'
import { test } from '@japa/runner'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { AuthManager } from '../src/AuthManager'
import { setupApplication, setup, getUserModel, cleanup } from '../test-helpers'

let app: ApplicationContract

test.group('Auth Provider', (group) => {
  group.each.setup(async () => {
    app = await setupApplication(
      ['@japa/preset-adonis/TestsProvider', '../../providers/AuthProvider'],
      'test',
      'memory'
    )

    return () => cleanup(app)
  })

  group.each.teardown(() => {
    app.container.resolveBinding('Japa/Preset/ApiClient').clearRequestHandlers()
    app.container.resolveBinding('Japa/Preset/ApiClient').clearSetupHooks()
    app.container.resolveBinding('Japa/Preset/ApiClient').clearTeardownHooks()
  })

  test('register auth provider', async ({ assert }) => {
    assert.instanceOf(app.container.use('Adonis/Addons/Auth'), AuthManager)
  })

  test('define auth property on http context', async ({ assert }) => {
    assert.isTrue(app.container.use('Adonis/Core/HttpContext')['hasGetter']('auth'))
  })

  test('login user using session', async ({ assert }) => {
    await setup(app)

    const User = getUserModel(app.container.use('Adonis/Lucid/Orm').BaseModel)
    const user = await User.create({
      email: 'virk@adonisjs.com',
      username: 'virk',
      password: 'secret',
    })

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)

      await ctx.session.initiate(false)
      await ctx.auth.check()

      try {
        ctx.response.send(ctx.auth.user)
      } catch (error) {
        ctx.response.status(500).send(error.stack)
      }

      ctx.response.finish()
    })
    server.listen(3333)

    const client = new (app.container.use('Japa/Preset/ApiClient'))('http://localhost:3333')
    const response = await client.get('/').loginAs({ id: user.id })

    server.close()

    assert.deepEqual(response.status(), 200)
    assert.containsSubset(response.body(), { username: 'virk', email: 'virk@adonisjs.com' })
  })

  test('login user using custom guard', async ({ assert }) => {
    await setup(app)

    const User = getUserModel(app.container.use('Adonis/Lucid/Orm').BaseModel)
    const user = await User.create({
      email: 'virk@adonisjs.com',
      username: 'virk',
      password: 'secret',
    })

    const server = createServer(async (req, res) => {
      const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)

      await ctx.session.initiate(false)
      await ctx.auth.use('apiDb').check()

      try {
        ctx.response.send(ctx.auth.use('apiDb').user)
      } catch (error) {
        ctx.response.status(500).send(error.stack)
      }

      ctx.response.finish()
    })
    server.listen(3333)

    const client = new (app.container.use('Japa/Preset/ApiClient'))('http://localhost:3333')
    const response = await client.get('/').guard('apiDb').loginAs({ id: user.id })
    server.close()

    assert.deepEqual(response.status(), 200)
    assert.containsSubset(response.body(), { username: 'virk', email: 'virk@adonisjs.com' })
  })
})
