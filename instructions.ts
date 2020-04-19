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
import { Application } from '@adonisjs/application/build/src/Application'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

/**
 * Prompt choices for the provider selection
 */
const PROVIDER_PROMPT_CHOICES = [
  {
    name: 'lucid',
    message: 'Lucid',
    hint: ' (Uses Data models)',
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
    name: 'session',
    message: 'Sessions',
    hint: ' (Uses sessions for managing auth state)',
  },
]

/**
 * Creates the model file
 */
function makeModel (projectRoot: string, app: ApplicationContract, sink: typeof sinkStatic, modelName: string) {
  const modelsDirectory = app.resolveNamespaceDirectory('models') || 'app/Models'
  const modelPath = join(modelsDirectory, `${modelName.replace(/\.ts$/, '')}.ts`)

  const template = new sink.DotTemplate(projectRoot, modelPath, './templates/model.dot')
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
  guard: 'session',
) {
  const modelsNamespace = app.namespacesMap.get('models')
  const modelImportNamespace = modelName ? `${modelsNamespace}/${modelName}` : undefined

  const template = new sink.DotTemplate(projectRoot, 'contracts/auth.ts', './templates/contract.dot')
  template.overwrite = true
  template.apply({ provider, guard, modelImportNamespace, modelName }).commit()

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
  guard: 'session',
) {
  const modelsNamespace = app.namespacesMap.get('models')
  const modelImportNamespace = modelName ? `${modelsNamespace}/${modelName}` : undefined

  const template = new sink.DotTemplate(projectRoot, 'config/auth.ts', './templates/config.dot')
  template.overwrite = true
  template.apply({ provider, guard, modelImportNamespace, modelName }).commit()

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
    .choice<'session'>('Select authentication guard', GUARD_PROMPT_CHOICES)

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

instructions(__dirname, new Application(__dirname, {} as any, {} as any, {} as any), sinkStatic)
  .catch(console.log)
