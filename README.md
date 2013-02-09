# sequelize-restful

A connect module that adds a restful API for all defined models to your application.

## Usage

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

## Options

```js
{
  // Parameter:   endpoint
  // Description: Define the path to the restful API.
  // Default:     '/api'

  endpoint: '/restful'
}
```

## The API

### Get a list of all declared models

```console
$ curl http://localhost:3000/api
```

```js
{
  "status": "success",
  "data": [
    {
      "name": "Tag",
      "tableName": "Tags"
    },
    {
      "name": "Image",
      "tableName": "Images"
    },
    {
      "name": "Project",
      "tableName": "Projects"
    }
  ]
}
```
