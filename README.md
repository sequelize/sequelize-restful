# sequelize-restful

A connect module that adds a restful API for all defined models to your application.

## Usage:

```js
var express   = require('express')
  , Sequelize = require('sequelize')
  , http      = require('http')
  , restful   = require('sequelize-restful')
  , sequelize = new Sequelize('database', 'username', 'password')
  , app       = express()

// define all your models before the configure block

app.configure(function() {
  app.use(restful(sequelize, { /* options */ }))
})

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'))
})
```

## Options:

```js
{
  // Define the path to the restful API.
  // default: '/api'

  endpoint: '/restful'
}
```
