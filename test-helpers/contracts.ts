import { User } from '../example/models'

declare module '@ioc:Adonis/Addons/Auth' {
  interface ProvidersList {
    lucid: {
      implementation: LucidProviderContract<typeof User>
      config: LucidProviderConfig<typeof User>
    }
    database: {
      config: DatabaseProviderConfig
      implementation: DatabaseProviderContract<DatabaseProviderRow>
    }
  }

  interface GuardsList {
    session: {
      implementation: SessionGuardContract<'lucid', 'session'>
      config: SessionGuardConfig<'lucid'>
      client: SessionClientContract<'lucid'>
    }
    api: {
      implementation: OATGuardContract<'lucid', 'api'>
      config: OATGuardConfig<'lucid'>
      client: OATClientContract<'lucid'>
    }
    apiDb: {
      implementation: OATGuardContract<'database', 'apiDb'>
      config: OATGuardConfig<'database'>
      client: OATClientContract<'database'>
    }
    sessionDb: {
      implementation: SessionGuardContract<'database', 'sessionDb'>
      config: SessionGuardConfig<'database'>
      client: SessionClientContract<'database'>
    }
    basic: {
      implementation: BasicAuthGuardContract<'lucid', 'basic'>
      config: BasicAuthGuardConfig<'lucid'>
      client: BasicAuthClientContract<'lucid'>
    }
  }
}

declare module '@ioc:Adonis/Core/Hash' {
  interface HashersList {
    bcrypt: HashDrivers['bcrypt']
  }
}
