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

  interface AuthenticatorsList {
    session: {
      implementation: SessionDriverContract<'lucid'>,
      config: SessionDriverConfig<'lucid'>,
    },
    sessionDb: {
      implementation: SessionDriverContract<'database'>,
      config: SessionDriverConfig<'database'>,
    },
  }
}

declare module '@ioc:Adonis/Core/Hash' {
  interface HashersList {
    bcrypt: HashDrivers['bcrypt'],
  }
}
