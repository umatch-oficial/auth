/*
 * @adonisjs/auth
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { createHash } from 'crypto'
import { base64 } from '@poppinss/utils/build/helpers'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import {
  setup,
  reset,
  cleanup,
  getUserModel,
  getOatClient,
  setupApplication,
  getLucidProvider,
  getTokensDbProvider,
  getLucidProviderConfig,
} from '../../test-helpers'

let app: ApplicationContract

test.group('OAT Client | login', (group) => {
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

  test('login user and return the token', async ({ assert }) => {
    const User = getUserModel(app.container.use('Adonis/Lucid/Orm').BaseModel)
    const password = await app.container.use('Adonis/Core/Hash').make('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })
    const lucidProvider = getLucidProvider(app, { model: async () => User })
    const tokensProvider = getTokensDbProvider(app.container.use('Adonis/Lucid/Database'))

    const client = getOatClient(
      lucidProvider,
      getLucidProviderConfig({ model: async () => User }),
      tokensProvider
    )

    const { headers } = await client.login(user)
    assert.properties(headers, ['Authorization'])

    const [id, value] = headers!.Authorization.replace('Bearer ', '').split('.')

    const token = await tokensProvider.read(
      base64.urlDecode(id, undefined, true)!,
      createHash('sha256').update(value).digest('hex'),
      'opaque_token'
    )

    assert.equal(token!.userId, user.id)
  })

  test('login user and return the token when mapping name is different', async ({ assert }) => {
    const User = getUserModel(app.container.use('Adonis/Lucid/Orm').BaseModel)
    const password = await app.container.use('Adonis/Core/Hash').make('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })
    const lucidProvider = getLucidProvider(app, { model: async () => User })
    const tokensProvider = getTokensDbProvider(app.container.use('Adonis/Lucid/Database'))

    const client = getOatClient(
      lucidProvider,
      getLucidProviderConfig({ model: async () => User }),
      tokensProvider,
      { type: 'pat' }
    )

    const { headers } = await client.login(user)
    assert.properties(headers, ['Authorization'])

    const [id, value] = headers!.Authorization.replace('Bearer ', '').split('.')

    const token = await tokensProvider.read(
      base64.urlDecode(id, undefined, true)!,
      createHash('sha256').update(value).digest('hex'),
      'pat'
    )

    assert.equal(token!.userId, user.id)
  })
})
