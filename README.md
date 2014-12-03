# sequelize-restful

A connect module based on a fork of sequelize-restful that adds a one level of associative capability to a restful API. It also lets you define which model should be exposed through this restful API.

## Unmaintained

This project is not actively developed/maintained. Please consider using [epilogue](https://github.com/dchester/epilogue).

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

  endpoint: '/restful',

  // Parameter:   allowed
  // Description: Define which models will be exposed through the restful API
  // Default:     'new Array()' if it is an Empty array, all the models will be exposed by default

  allowed: new Array('Model0', 'Model1', 'Model2')
}
```

## The API

### GET /api

Returns a list of all declared models

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

### HEAD /api/Tags

Returns a description of a declared model

```console
$ curl -i -X HEAD http://localhost:3000/api/Tags
```

The result of the request is part of the response headers! The header's name is `Sequelize-Admin`.

```js
{
  "status": "success",
  "data": {
    "name": "Tag",
    "tableName": "Tags",
    "attributes": {
      "title": "VARCHAR(255)",
      "id": {
        "type": "INTEGER",
        "allowNull": false,
        "primaryKey": true,
        "autoIncrement": true
      },
      "createdAt": {
        "type": "DATETIME",
        "allowNull": false
      },
      "updatedAt": {
        "type": "DATETIME",
        "allowNull": false
      },
      "ProjectId": {
        "type": "INTEGER"
      }
    }
  }
}
```

### GET /api/Tags/1

Returns the data of the Tag with the id 1.

```console
$ curl http://localhost:3000/api/Tags/1
```

```js
{
  "status": "success",
  "data": {
    "title": "foo",
    "id": 1,
    "createdAt": "2013-02-09T09:48:14.000Z",
    "updatedAt": "2013-02-09T09:48:14.000Z",
    "ProjectId": 1
  }
}
```

### POST /api/Tags

Creating a new instance of a model

```console
curl -d "title=hallo%20world" http://localhost:3000/api/Tags
```

```js
{
  "status": "success",
  "data": {
    "title": "hallo world",
    "id": 1,
    "createdAt": "2013-02-09T09:48:14.000Z",
    "updatedAt": "2013-02-09T09:48:14.000Z"
  }
}
```

### PUT /api/Tags/1

Updating an already existing instance of a model

```console
curl -d "title=fnord" -X PUT http://localhost:3000/api/Tags/1
```

It returns the updated record

```js
{
  "status": "success",
  "data": {
    "title": "fnord",
    "id": 1,
    "createdAt": "2013-02-14T19:52:04.000Z",
    "updatedAt": "2013-02-14T19:53:30.066Z",
    "ProjectId": 1
  }
}
```

### DELETE /api/Tags/1

Deleting an existing instance of a model

```console
curl -i -X DELETE http://localhost:3000/admin/api/Tags/3
```

```js
{
  "status": "success",
  "data": {}
}
```

## The API for Associations

### GET /api/Projects/1/Tags

Returns all the instance of 'associated_dao_factory' associated to the instance 1 of 'dao_factory'

```console
curl -i -X GET http://localhost:3000/admin/api/Projects/1/Tags

```

```js
{
  "status": "success",
  "data": {
    "title": "foo",
    "id": 1,
    "createdAt": "2013-02-09T09:48:14.000Z",
    "updatedAt": "2013-02-09T09:48:14.000Z",
    "ProjectId": 1
  }
}
```

### DELETE /api/Photo/1/Photographer

Deleting an existing association for 1:1 or N:1 association.

```console
curl -i -X DELETE http://localhost:3000/admin/api/Photo/1/Photographer
```

```js
{
  "status": "success",
  "data": {}
}
```

### DELETE /api/Projects/1/Tags/1

Deleting an existing association between instances

```console
curl -i -X DELETE http://localhost:3000/admin/api/Projects/1/Tags/3
```

```js
{
  "status": "success",
  "data": {}
}
```
