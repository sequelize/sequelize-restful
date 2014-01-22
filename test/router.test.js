var expect    = require('expect.js')
  , Router    = require('../lib/router')
  , Sequelize = require('sequelize')
  , config    = {
      database: 'sequelize_test',
      username: 'root',
      password: null,
      logging:  false
    }

describe('Router', function() {
  describe('isRestfulRequest', function() {
    it('returns true if the default route was used', function() {
      expect(new Router().isRestfulRequest('/api/photos')).to.be.ok()
    })

    it('returns false if another route was used', function() {
      expect(new Router().isRestfulRequest('/fnord/photos')).to.not.be.ok()
    })

    it('returns true if the optional route was used', function() {
      var router = new Router(null, { endpoint: '/fnord' })
      expect(router.isRestfulRequest('/fnord/photos')).to.be.ok()
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
            expect(response.status).to.equal('success')
            expect(response.data).to.eql([])
            done()
          })
        })

        it('returns an array if one entry if the dataset was created before', function(done) {
          this.Photo.create({ name: 'fnord' }).complete(function(err) {
            this.router.handleRequest({ method: 'GET', path: '/api/photos', body: null }, function(response) {
              expect(response.status).to.equal('success')
              expect(response.data.length).to.equal(1)
              expect(response.data[0].name).to.equal('fnord')
              done()
            })
          }.bind(this))
        })
      })

      describe('POST', function() {
        it('creates a new photo instance', function(done) {
          var self = this

          this.Photo.count().success(function(photoCountBefore) {
            self.router.handleRequest({
              method: 'POST',
              path: '/api/photos',
              body: {
                name: 'my lovely photo'
              }
            }, function() {
              self.Photo.count().success(function(photoCountAfter) {
                expect(photoCountAfter).to.equal(photoCountBefore + 1)
                done()
              })
            })
          })
        })
      })

      describe('HEAD', function() {
        it('returns the structure of the model', function(done) {
          this.router.handleRequest({
            method: 'HEAD',
            path:   '/api/photos',
            body:   null
          }, function(response) {
            expect(response.status).to.equal('success')

            expect(response.data.name).to.equal('Photo')
            expect(response.data.tableName).to.equal('photos')

            expect(Object.keys(response.data.attributes)).to.eql(['id', 'name', 'createdAt', 'updatedAt'])

            done()
          })
        })
      })
    })

    describe('/api/photos/<id>', function() {
      before(function(done) {
        var self = this

        this.Photo.destroy().success(function() {
          self.Photo.create({ name: 'a lovely photo' }).success(function(photo) {
            self.photoId = photo.id
            done()
          })
        })
      })

      describe('GET', function() {
        it('returns the information of the photo', function(done) {
          var self = this

          this.router.handleRequest({
            method: 'GET',
            path:   '/api/photos/' + this.photoId,
            body:   null
          }, function(response) {
            expect(response.status).to.equal('success')
            expect(response.data.id).to.equal(self.photoId)
            expect(response.data.name).to.equal('a lovely photo')

            // this seems to be a bug ...
            expect(response.data.createdAt).to.be.a('object')
            expect(response.data.updatedAt).to.be.a('object')

            done()
          })
        })
      })
    })
  })
})
