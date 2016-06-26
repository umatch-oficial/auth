# Adonis Auth

[![Gitter](https://img.shields.io/badge/+%20GITTER-JOIN%20CHAT%20%E2%86%92-1DCE73.svg?style=flat-square)](https://gitter.im/adonisjs/adonis-framework)
[![Trello](https://img.shields.io/badge/TRELLO-%E2%86%92-89609E.svg?style=flat-square)](https://trello.com/b/yzpqCgdl/adonis-for-humans)
[![Version](https://img.shields.io/npm/v/adonis-auth.svg?style=flat-square)](https://www.npmjs.com/package/adonis-auth)
[![Build Status](https://img.shields.io/travis/adonisjs/adonis-auth/master.svg?style=flat-square)](https://travis-ci.org/adonisjs/adonis-auth)
[![Coverage Status](https://img.shields.io/coveralls/adonisjs/adonis-auth/master.svg?style=flat-square)](https://coveralls.io/github/adonisjs/adonis-auth?branch=master)
[![Downloads](https://img.shields.io/npm/dt/adonis-auth.svg?style=flat-square)](https://www.npmjs.com/package/adonis-auth)
[![License](https://img.shields.io/npm/l/adonis-auth.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> :pray: This repository contains the authentication provider for Adonis Framework.

Auth provider is a fully featured authentication system for Adonis framework. It supports multiple authentication schemes to authenticate HTTP requests.

## Supported Schemes

1. Sessions
2. Basic-Auth
3. JWT Tokens
4. API Token

In order to verify users credentials, it makes use of Serializers and below serializers are shipped with this library.

1. Lucid
2. Database Provider

You are free to add your own schemes and serializers and documentation for same is written on the official website

## Table of Contents

* [Config](#config)
* [Setup](#setup)
* [Team Members](#team-members)
* [Contribution Guidelines](#contribution-guidelines)

## <a name="config"></a>Config

Configuration settings are slightly different for each scheme. When you define settings, we call them authenticators.

In short, an authenticator is a combination of `scheme`, `serializer` and common settings around them.

### Example
**config/auth.js**
```javascript
{
  authenticator: 'session',

  session: {
    ...
  }
}
```


### Session

```javascript
session: {
  serializer: 'Lucid',
  scheme: 'session',
  model: 'App/Model/User',
  uid: 'email',
  password: 'password'
}
```

### Basic Auth

```javascript
basicAuth: {
  serializer: 'Lucid',
  scheme: 'basic',
  model: 'App/Model/User',
  uid: 'email',
  password: 'password'
}
```

### JWT

```javascript
jwt: {
  serializer: 'Lucid',
  scheme: 'jwt',
  model: 'App/Model/User',
  secret: Config.get('app.appKey')
}
```

### API Tokens

Personal api tokens are like passwords for a given account. Majority of API's needs API based authentication because:

1. Their customers developers want to use the API in order to build something.
2. Sharing account details with the developer is never secure, so instead they can generate a token
and give it to the developer for testing.

```javascript
{
  serializer: 'Lucid',
  scheme: 'api',
  model: 'App/Model/Token',
  expiry: '30d'
}
```

Also you need to create the relationship between the user and the token, so that the Lucid serializer can make use of it.

**app/Model/User.js**
```javascript
class User extends Lucid {

  apiTokens () {
    return this.hasMany('App/Model/Token')
  }

}
```

**app/Model/Token.js**
```javascript
class Token extends Lucid {

  user () {
    return this.belongsTo('App/Model/User')
  }

}
```

## <a name="setup"></a>Setup

In order to make use of the Auth provider, you need to register it inside your `bootstrap/app.js` file.

### Required Setup

```javascript
const providers = [
  ...,
  'adonis-auth/providers/AuthManagerProvider'
]
```

Next you need to register the `AuthInit` middleware. This middleware will create a new instance of Auth Manager and will assign it to the request object.

**app/Http/kernel.js**
```javascript
const globalMiddleware = [
  ...,
  'Adonis/Middleware/AuthInit'
]
```
and you are good to go. From here you can make use of `request.auth` to authenticate/login your users.

### Usage

```javascript
// find if a user is logged in
yield request.auth.check()

// attempt to login a user
yield request.auth.attempt('email', 'password')

// login using user object
yield request.auth.login(user)
yield request.auth.loginViaId(1)
yield request.auth.logout()
```

### Automatic Authentication

Auth provider also ships with an extra middleware, which can be assigned to your routes to authenticate them.

**app/Http/kernel.js**
```javascript
const namedMiddleware = {
  auth: 'Adonis/Middleware/Auth'
}
```

and then inside your routes file you can do.

#### Using default authenticator
```javascript
Route
  .get('account', 'AccountController.index')
  .middleware('auth')
```

#### Defining authenticator
```javascript
Route
  .get('account', 'AccountController.index')
  .middleware('auth:basic')
```

## <a name="team-members"></a>Team Members

* Harminder Virk ([Caffiene Blogging](http://amanvirk.me/)) <virk.officials@gmail.com>

## <a name="contribution-guidelines"></a>Contribution Guidelines

In favor of active development we accept contributions for everyone. You can contribute by submitting a bug, creating pull requests or even improving documentation.

You can find a complete guide to be followed strictly before submitting your pull requests in the [Official Documentation](http://adonisjs.com/docs/2.0/contributing).
