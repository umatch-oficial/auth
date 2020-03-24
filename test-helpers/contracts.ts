import { User } from '../example/models'

declare module '@ioc:Adonis/Addons/Auth' {
  interface ProvidersList {
    lucid: {
      implementation: LucidProviderContract<typeof User>,
      config: LucidProviderConfig<typeof User>,
    },
    database: {
      config: DatabaseProviderConfig,
      implementation: DatabaseProviderContract<any>,
    },
  }

  interface GuardsList {
    session: {
      implementation: SessionGuardContract<'lucid', 'session'>,
      config: SessionGuardConfig<'lucid'>,
    },
    sessionDb: {
      implementation: SessionGuardContract<'database', 'sessionDb'>,
      config: SessionGuardConfig<'database'>,
    },
  }
}

declare module '@ioc:Adonis/Core/Hash' {
  interface HashersList {
    bcrypt: HashDrivers['bcrypt'],
  }
}
