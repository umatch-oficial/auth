/*
 * @adonisjs/auth
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import {
  setup,
  reset,
  cleanup,
  getUserModel,
  setupApplication,
  getSessionClient,
  getLucidProvider,
  getLucidProviderConfig,
} from '../../test-helpers'

let app: ApplicationContract

test.group('Session Client | login', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    await setup(app)
  })

  group.teardown(async () => {
    await cleanup(app)
  })

  group.each.teardown(async () => {
    await reset(app)
    app.container.use('Adonis/Core/Event')['clearAllListeners']()
  })

  test('login user and return the session', async ({ assert }) => {
    const User = getUserModel(app.container.use('Adonis/Lucid/Orm').BaseModel)
    const password = await app.container.use('Adonis/Core/Hash').make('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })
    const lucidProvider = getLucidProvider(app, { model: async () => User })

    const client = getSessionClient(
      lucidProvider,
      getLucidProviderConfig({ model: async () => User })
    )

    const { session } = await client.login(user)
    assert.deepEqual(session, {
      auth_session: user.id,
    })
  })

  test('login user and return the session when mapping name is different', async ({ assert }) => {
    const User = getUserModel(app.container.use('Adonis/Lucid/Orm').BaseModel)
    const password = await app.container.use('Adonis/Core/Hash').make('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })
    const lucidProvider = getLucidProvider(app, { model: async () => User })

    const client = getSessionClient(
      lucidProvider,
      getLucidProviderConfig({ model: async () => User }),
      'foo'
    )

    const { session } = await client.login(user)
    assert.deepEqual(session, {
      auth_foo: user.id,
    })
  })
})
