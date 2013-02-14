var buster    = require('buster')
  , Router    = require('../lib/router')
  , Sequelize = require('sequelize')
  , config    = {
      database: 'sequelize_test',
      username: 'root',
      password: null,
      logging:  false
    }

buster.spec.expose()

describe('Router', function() {
  describe('isRestfulRequest', function() {
    it('returns true if the default route was used', function() {
      expect(new Router().isRestfulRequest('/api/photos')).toBeTrue()
    })

    it('returns false if another route was used', function() {
      expect(new Router().isRestfulRequest('/fnord/photos')).toBeFalse()
    })

    it('returns true if the optional route was used', function() {
      var router = new Router(null, { endpoint: '/fnord' })
      expect(router.isRestfulRequest('/fnord/photos')).toBeTrue()
    })
  })

  describe('handleRequest', function() {
    before(function(done) {
      this.sequelize = new Sequelize(config.database, config.username, config.password, config)
      this.Photo     = this.sequelize.define('Photo', { name: Sequelize.STRING }, { tableName: 'photos' })
      this.router    = new Router(this.sequelize, {})

      this.sequelize.sync({ force: true }).complete(function(err) {
        if (err) {
          throw err
        } else {
          done()
        }
      })
    })

    describe('/api/photos', function() {
      describe('GET', function() {
        it('returns an empty array if no table entries were created before', function(done) {
          this.router.handleRequest({ method: 'GET', path: '/api/photos', body: null }, function(response) {
            expect(response.status).toEqual('success')
            expect(response.data).toEqual([])
            done()
          })
        })

        it('returns an array if one entry if the dataset was created before', function(done) {
          this.Photo.create({ name: 'fnord' }).complete(function(err) {
            this.router.handleRequest({ method: 'GET', path: '/api/photos', body: null }, function(response) {
              expect(response.status).toEqual('success')
              expect(response.data.length).toEqual(1)
              expect(response.data[0].name).toEqual('fnord')
              done()
            })
          }.bind(this))
        })
      })
    })
  })
})
