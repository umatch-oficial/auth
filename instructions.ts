/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { join } from 'path'
import pluralize from 'pluralize'
import { lodash } from '@poppinss/utils'
import * as sinkStatic from '@adonisjs/sink'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

type InstructionsState = {
  modelName?: string,
  modelReference?: string,
  modelNamespace?: string,
  tableName: string,
  schemaName: string,
  provider: 'lucid' | 'database',
  guard: 'web',
}

const MIGRATION_TIME_PREFIX = '1587988332388'

/**
 * Base path to contract stub partials
 */
const CONTRACTS_PARTIALS_BASE = './contract/partials'

/**
 * Base path to config stub partials
 */
const CONFIG_PARTIALS_BASE = './config/partials'

/**
 * Prompt choices for the provider selection
 */
const PROVIDER_PROMPT_CHOICES = [
  {
    name: 'lucid' as const,
    message: 'Lucid',
    hint: ' (Uses Data Models)',
  },
  {
    name: 'database' as const,
    message: 'Database',
    hint: ' (Uses Database QueryBuilder)',
  },
]

/**
 * Prompt choices for the guard selection
 */
const GUARD_PROMPT_CHOICES = [
  {
    name: 'web' as const,
    message: 'Web',
    hint: ' (Uses sessions for managing auth state)',
  },
]

/**
 * Returns absolute path to the stub relative from the templates
 * directory
 */
function getStub (...relativePaths: string[]) {
  return join(__dirname, 'templates', ...relativePaths)
}

/**
 * Creates the model file
 */
function makeModel (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  state: InstructionsState,
) {
  const modelsDirectory = app.resolveNamespaceDirectory('models') || 'app/Models'
  const modelPath = join(modelsDirectory, `${state.modelName}.ts`)

  const template = new sink.files.MustacheFile(projectRoot, modelPath, getStub('model.txt'))
  if (template.exists()) {
    sink.logger.skip(`${modelPath} file already exists`)
    return
  }

  template.apply(state).commit()
  sink.logger.create(modelPath)
}

/**
 * Create the migration file
 */
function makeMigration (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  state: InstructionsState,
) {
  const migrationsDirectory = app.directoriesMap.get('migrations') || 'database'
  const migrationPath = join(migrationsDirectory, `${MIGRATION_TIME_PREFIX}_${state.tableName}.ts`)

  const template = new sink.files.MustacheFile(projectRoot, migrationPath, getStub('migrations/auth.txt'))
  if (template.exists()) {
    sink.logger.skip(`${migrationPath} file already exists`)
    return
  }

  template.apply(state).commit()
  sink.logger.create(migrationPath)
}

/**
 * Create the middleware(s)
 */
function makeMiddleware (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  state: InstructionsState,
) {
  const middlewareDirectory = app.resolveNamespaceDirectory('middleware') || 'app/Middleware'

  /**
   * Auth middleware
   */
  const authPath = join(middlewareDirectory, 'Auth.ts')
  const authTemplate = new sink.files.MustacheFile(projectRoot, authPath, getStub('middleware/Auth.txt'))
  if (authTemplate.exists()) {
    sink.logger.skip(`${authPath} file already exists`)
  } else {
    authTemplate.apply(state).commit()
    sink.logger.create(authPath)
  }

  /**
   * Silent auth middleware
   */
  const silentAuthPath = join(middlewareDirectory, 'SilentAuth.ts')
  const silentAuthTemplate = new sink.files.MustacheFile(
    projectRoot,
    silentAuthPath,
    getStub('middleware/SilentAuth.txt'),
  )
  if (silentAuthTemplate.exists()) {
    sink.logger.skip(`${silentAuthPath} file already exists`)
  } else {
    silentAuthTemplate.apply(state).commit()
    sink.logger.create(silentAuthPath)
  }
}

/**
 * Creates the contract file
 */
function makeContract (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  state: InstructionsState,
) {
  const contractsDirectory = app.directoriesMap.get('contracts') || 'contracts'
  const contractPath = join(contractsDirectory, 'auth.ts')

  const template = new sink.files.MustacheFile(projectRoot, contractPath, getStub('contract/auth.txt'))
  template.overwrite = true

  template
    .apply(state)
    .partials({
      guard: getStub(CONTRACTS_PARTIALS_BASE, `${state.guard}-guard.txt`),
      provider: getStub(CONTRACTS_PARTIALS_BASE, `user-provider-${state.provider}.txt`),
    })
    .commit()

  sink.logger.create(contractPath)
}

/**
 * Makes the auth config file
 */
function makeConfig (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
  state: InstructionsState,
) {
  const configDirectory = app.directoriesMap.get('config') || 'config'
  const configPath = join(configDirectory, 'auth.ts')

  const template = new sink.files.MustacheFile(projectRoot, configPath, getStub('config/auth.txt'))
  template.overwrite = true

  template
    .apply(state)
    .partials({
      guard: getStub(CONFIG_PARTIALS_BASE, `${state.guard}-guard.txt`),
      provider: getStub(CONFIG_PARTIALS_BASE, `user-provider-${state.provider}.txt`),
    })
    .commit()

  sink.logger.create(configPath)
}

/**
 * Prompts user to select the provider
 */
async function getProvider (sink: typeof sinkStatic) {
  return sink
    .getPrompt()
    .choice('Select provider for finding users', PROVIDER_PROMPT_CHOICES)
}

/**
 * Prompts user to select one or more guards
 */
async function getGuard (sink: typeof sinkStatic) {
  return sink
    .getPrompt()
    .choice('Select authentication guard', GUARD_PROMPT_CHOICES)
}

/**
 * Prompts user for the model name
 */
async function getModelName (sink: typeof sinkStatic): Promise<string> {
  return sink.getPrompt().ask('Enter model name to be used for authentication', {
    validate (value) {
      return !!value.trim().length
    },
  })
}

/**
 * Prompts user for the table name
 */
async function getTableName (sink: typeof sinkStatic): Promise<string> {
  return sink.getPrompt().ask('Enter the database table name to look up users', {
    validate (value) {
      return !!value.trim().length
    },
  })
}

/**
 * Prompts user for the table name
 */
async function getMigrationConsent (sink: typeof sinkStatic, tableName: string): Promise<string> {
  return sink
    .getPrompt()
    .confirm(`Create migration for the ${sink.colors.underline(tableName)} table?`)
}

/**
 * Instructions to be executed when setting up the package.
 */
export default async function instructions (
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic,
) {
  const state: InstructionsState = {
    tableName: '',
    schemaName: '',
    provider: 'lucid',
    guard: 'web',
  }

  state.provider = await getProvider(sink)
  state.guard = await getGuard(sink)

  /**
   * Make model when provider is lucid otherwise prompt for the database
   * table name
   */
  if (state.provider === 'lucid') {
    const modelName = await getModelName(sink)
    state.modelName = modelName.replace(/(\.ts|\.js)$/, '')
    state.tableName = pluralize(lodash.snakeCase(state.modelName))
    state.modelReference = lodash.camelCase(state.modelName)
    state.modelNamespace = `${app.namespacesMap.get('models') || 'App/Models'}/${state.modelName}`
  } else {
    state.tableName = await getTableName(sink)
  }

  const migrationConstent = await getMigrationConsent(sink, state.tableName)

  /**
   * Pascal case
   */
  const camelCaseSchemaName = lodash.camelCase(`${state.tableName}_schema`)
  state.schemaName = `${camelCaseSchemaName.charAt(0).toUpperCase()}${camelCaseSchemaName.slice(1)}`

  /**
   * Make model when prompted for it
   */
  if (state.modelName) {
    makeModel(projectRoot, app, sink, state)
  }

  /**
   * Make migration file
   */
  if (migrationConstent) {
    makeMigration(projectRoot, app, sink, state)
  }

  /**
   * Make contract file
   */
  makeContract(projectRoot, app, sink, state)

  /**
   * Make config file
   */
  makeConfig(projectRoot, app, sink, state)

  /**
   * Make middleware
   */
  makeMiddleware(projectRoot, app, sink, state)
}
