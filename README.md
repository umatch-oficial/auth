
## Api Design

### Session
```
await auth.check() // find if user is logged in
await auth.getUser() // check + get user
auth.user // reference to user

await auth.validate() // validate user credentials

await auth.attempt() // validate and login 
      -> throws exception if instance belongs to user

await auth.login() // login using user details
      -> throws exception if instance belongs to user

await auth.loginViaId() // login user using it's id
      -> throws exception if instance belongs to user

await auth.logout()  // logout user
      -> mark instance as non-usable for edits

auth.query((builder) => {
  builder.with('permission')
})
```
