/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { join } from 'path'
import * as sinkStatic from '@adonisjs/sink'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Base path to contract stub partials
 */
const CONTRACTS_PARTIALS_BASE = './templates/contract/partials'

/**
 * Base path to config stub partials
 */
const CONFIG_PARTIALS_BASE = './templates/config/partials'

/**
 * Prompt choices for the provider selection
 */
const PROVIDER_PROMPT_CHOICES = [
  {
    name: 'lucid',
    message: 'Lucid',
    hint: ' (Uses Data Models)',
  },
  {
    name: 'database',
    message: 'Database',
    hint: ' (Uses Database QueryBuilder)',
  },
]

/**
 * Prompt choices for the guard selection
 */
const GUARD_PROMPT_CHOICES = [
  {
    name: 'web',
    message: 'Web',
    hint: ' (Uses sessions for managing auth state)',
  },
]

/**
 * Creates the model file
 */
function makeModel (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  modelName: string,
) {
  const modelsDirectory = app.resolveNamespaceDirectory('models') || 'app/Models'
  const modelPath = join(modelsDirectory, `${modelName.replace(/\.ts$/, '')}.ts`)

  const template = new sink.files.MustacheFile(projectRoot, modelPath, './templates/model.txt')
  if (template.exists()) {
    sink.logger.skip(`${modelPath} file already exists`)
    return
  }

  template.apply({}).commit()
  sink.logger.create(modelPath)
}

/**
 * Creates the contract file
 */
function makeContract (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  modelName: string | undefined,
  provider: 'lucid' | 'database',
  guard: 'web',
) {
  const modelNamespace = app.namespacesMap.get('models') || 'App/Models'
  const modelImportNamespace = modelName ? `${modelNamespace}/${modelName}` : undefined

  const template = new sink.files.MustacheFile(
    projectRoot,
    'contracts/auth.ts',
    './templates/contract/auth.txt',
  )
  template.overwrite = true

  template
    .apply({ modelImportNamespace, modelName })
    .partials({
      guard: `${CONTRACTS_PARTIALS_BASE}/${guard}-guard.txt`,
      provider: `${CONTRACTS_PARTIALS_BASE}/user-provider-${provider}.txt`,
    })
    .commit()

  sink.logger.create('contracts/auth.ts')
}

/**
 * Makes the auth config file
 */
function makeConfig (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  modelName: string | undefined,
  provider: 'lucid' | 'database',
  guard: 'web',
) {
  const modelsNamespace = app.namespacesMap.get('models') || 'App/Models'
  const modelImportNamespace = modelName ? `${modelsNamespace}/${modelName}` : undefined

  const template = new sink.files.MustacheFile(
    projectRoot,
    'config/auth.ts',
    './templates/config/auth.txt',
  )
  template.overwrite = true

  template
    .apply({ modelImportNamespace, modelName })
    .partials({
      guard: `${CONFIG_PARTIALS_BASE}/${guard}-guard.txt`,
      provider: `${CONFIG_PARTIALS_BASE}/user-provider-${provider}.txt`,
    })
    .commit()

  sink.logger.create('config/auth.ts')
}

/**
 * Instructions to be executed when setting up the package.
 */
export default async function instructions (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
) {
  const provider = await sink
    .getPrompt()
    .choice<'lucid' | 'database'>('Select provider for finding users', PROVIDER_PROMPT_CHOICES)

  const guard = await sink
    .getPrompt()
    .choice<'web'>('Select authentication guard', GUARD_PROMPT_CHOICES)

  let modelName: string | undefined

  /**
   * Make model when provider is lucid
   */
  if (provider === 'lucid') {
    modelName = await sink.getPrompt().ask('Enter model name to be used for authentication', {
      validate (value) {
        return !!value.trim().length
      },
    })
    makeModel(projectRoot, app, sink, modelName!)
  }

  makeContract(projectRoot, app, sink, modelName, provider, guard)
  makeConfig(projectRoot, app, sink, modelName, provider, guard)
}
