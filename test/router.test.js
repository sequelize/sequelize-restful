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
      this.sequelize    = new Sequelize(config.database, config.username, config.password, config)
      this.Photo        = this.sequelize.define('Photo', { name: Sequelize.STRING }, { tableName: 'photos' })
      this.Photographer = this.sequelize.define('Photographer', { name: Sequelize.STRING }, { tableName: 'photographers' })
      this.router       = new Router(this.sequelize, {})

      this.Photo.belongsTo(this.Photographer)
      this.Photographer.hasMany(this.Photo)

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

        it('returns an array matching only the attributes requested', function(done) {
          this.Photo.create({ name: 'dronf' }).complete(function(err) {
            this.Photo.create({ name: 'dron' }).complete(function(err) {
              this.Photo.create({ name: 'omnom' }).complete(function(err) {
                this.router.handleRequest({method: 'GET', path: '/api/photos', query: { name: 'dronf' }, body: null}, function(response) {
                  expect(response.status).to.equal('success')
                  expect(response.data.length).to.equal(1)
                  expect(response.data[0].name).to.equal('dronf')
                  done()
                })
              }.bind(this))
            }.bind(this))
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

            expect(Object.keys(response.data.attributes)).to.eql(['id', 'name', 'createdAt', 'updatedAt', 'photographerId'])

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

      describe('PUT', function() {
        it('updates a resource', function(done) {
          var self = this

          this.router.handleRequest({
            method: 'PUT',
            path:   '/api/photos/' + this.photoId,
            body:   { name: 'another name' }
          }, function(response) {
            self.Photo.find(self.photoId).success(function(photo) {
              expect(response.data.name).to.equal('another name')
              expect(photo.name).to.equal('another name')
              done()
            })
          })
        })
      })

      describe('DELETE', function() {
        it('deletes a resource', function(done) {
          var self = this

          this.Photo.count().success(function(photoCountBefore) {
            self.router.handleRequest({
              method: 'DELETE',
              path:   '/api/photos/' + self.photoId,
              body:   null
            }, function(response) {
              expect(response.status).to.equal('success')

              self.Photo.count().success(function(photoCountAfter) {
                expect(photoCountAfter).to.equal(photoCountBefore - 1)
                done()
              })
            })
          })
        })
      })
    })

    describe('associations', function() {
      beforeEach(function(done) {
        var self         = this
          , photo        = null
          , photographer = null


        this.Photo
          .destroy()
          .then(function() { return self.Photographer.destroy() })
          .then(function() { return self.Photographer.create({ name: 'Doctor Who' }) })
          .then(function(p) {
            self.photographer = p
            return self.Photo.create({ name: 'wondercat', photographerId: p.id })
          })
          .then(function(p) {
            self.photo = p
            done()
          })
      })

      describe('/api/photos/<id>/photographer', function() {
        describe('GET', function() {
          it('returns information about the photos photographer', function(done) {
            var self = this

            this.router.handleRequest({
              method: 'GET',
              path:   "/api/photos/" + this.photo.id + "/photographer",
              body:   null
            }, function(response) {
              expect(response.status).to.equal('success')
              expect(Object.keys(response.data).sort()).to.eql(['id', 'name', 'createdAt', 'updatedAt'].sort())
              expect(response.data.name).to.equal('Doctor Who')

              done()
            })
          })
        })

        describe('DELETE', function() {
          it('removes the association', function(done) {
            var self = this

            this.router.handleRequest({
              method: 'DELETE',
              path:   "/api/photos/" + this.photo.id + "/photographer",
              body:   null
            }, function(response) {
              expect(response.status).to.equal('success')

              self.photo.reload().success(function(photo) {
                expect(photo.photographerId).to.not.be.ok()
                done()
              })
            })
          })
        })
      })

      describe('/api/photographers/<id>/photos', function() {
        describe('GET', function() {
          it("returns information about the photographer's photos", function(done) {
            var self = this

            this.router.handleRequest({
              method: 'GET',
              path:   "/api/photographers/" + this.photographer.id + "/photos",
              body:   null
            }, function(response) {
              expect(response.status).to.equal('success')

              expect(response.data).to.be.an(Array)
              expect(response.data.length).to.equal(1)

              expect(Object.keys(response.data[0]).sort()).to.eql(Object.keys(self.photo.values).sort())
              expect(response.data[0].name).to.equal('wondercat')

              done()
            })
          })
        })
      })

      describe('/api/photographers/<id>/photos/<id>', function() {
        describe('DELETE', function() {
          it("removes the association", function(done) {
            var self = this

            this.router.handleRequest({
              method: 'DELETE',
              path:   "/api/photographers/" + this.photographer.id + "/photos/" + this.photo.id,
              body:   null
            }, function(response) {
              expect(response.status).to.equal('success')

              self.photo.reload().success(function(photo) {
                expect(photo.photographerId).to.not.be.ok()
                done()
              })
            })
          })
        })
      })
    })
  })
})
