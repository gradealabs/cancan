import test from 'ava'
import CanCan from '.'

class Model {
  constructor (attrs = {}) {
    this.attrs = attrs
  }

  get (key) {
    return this.attrs[key]
  }
}

class User extends Model {}
class Product extends Model {}
const aUser = user => user instanceof User
const anAdminUser = user => aUser(user) && !!user.get('admin')
const aProduct = product => product instanceof Product
const publishedProducts = product => aProduct(product) && !!product.get('published')

test('allow one action', t => {
  const cancan = new CanCan()
  const {can, allow, cannot} = cancan

  allow(aUser).to('read').on(aProduct)

  const user = new User()
  const product = new Product()

  t.true(can(user, 'read', product))
  t.false(cannot(user, 'read', product))
  t.false(can(user, 'create', product))
})

test('allow many actions', t => {
  const cancan = new CanCan()
  const {can, allow} = cancan

  allow(aUser, ['read', 'create', 'destroy'], aProduct)

  const user = new User()
  const product = new Product()

  t.true(can(user, 'read', product))
  t.true(can(user, 'create', product))
  t.true(can(user, 'destroy', product))
})

test('allow all actions using "manage"', t => {
  const cancan = new CanCan()
  const {can, allow} = cancan

  allow(aUser, 'read', anAdminUser)
  allow(aUser, 'manage', aProduct)

  const user = new User()
  const product = new Product()

  t.true(can(user, 'read', product))
  t.true(can(user, 'create', product))
  t.true(can(user, 'update', product))
  t.true(can(user, 'destroy', product))
  t.true(can(user, 'modify', product))
})

test('allow all actions and all objects', t => {
  const cancan = new CanCan()
  const {can, allow} = cancan

  allow(aUser, 'manage', () => true)

  const user = new User()
  const product = new Product()

  t.true(can(user, 'read', user))
  t.true(can(user, 'read', product))
})

test('allow only objects that satisfy given condition', t => {
  const cancan = new CanCan()
  const {can, allow} = cancan

  allow(aUser, 'read', publishedProducts)

  const user = new User()
  const privateProduct = new Product()
  const publicProduct = new Product({published: true})

  t.false(can(user, 'read', privateProduct))
  t.true(can(user, 'read', publicProduct))
})

test('allow only when performer passes a condition', t => {
  const cancan = new CanCan()
  const {can, allow} = cancan

  allow(anAdminUser, 'read', aProduct)

  const user = new User()
  const adminUser = new User({admin: true})
  const product = new Product()

  t.false(can(user, 'read', product))
  t.true(can(adminUser, 'read', product))
})

test('allow only when target passes a condition', t => {
  const cancan = new CanCan()
  const {can, allow} = cancan

  allow(aUser, 'read', publishedProducts)

  const user = new User()
  const privateProduct = new Product()
  const publicProduct = new Product({published: true})

  t.false(can(user, 'read', privateProduct))
  t.true(can(user, 'read', publicProduct))
})

test('can combine CanCan instances', t => {
  const cancan1 = new CanCan()
  const cancan2 = new CanCan()

  cancan1.allow(aUser, 'read', publishedProducts)
  cancan2.allow(aUser, 'write', publishedProducts)

  const cancan = CanCan.combine(cancan1, cancan2)

  const user = new User()
  const privateProduct = new Product()
  const publicProduct = new Product({published: true})

  t.false(cancan.can(user, 'read', privateProduct))
  t.true(cancan.can(user, 'read', publicProduct))
  t.true(cancan.can(user, 'write', publicProduct))
})

test('throw if permission is not granted', t => {
  const cancan = new CanCan()
  const {allow, authorize} = cancan

  allow(aUser, 'read', publishedProducts)

  const user = new User()
  const privateProduct = new Product()
  const publicProduct = new Product({published: true})

  authorize(user, 'read', publicProduct)

  t.throws(() => authorize(user, 'read', privateProduct), 'Action read not permitted')
})

test('throw a custom error if permission is not granted', t => {
  class AuthError {
    constructor (message) {
      this.message = message
    }
  }
  class CanCan2 extends CanCan {
    createAuthorizationError (actor, actions, target) {
      return new AuthError(`User couldn't ${actions} product`)
    }
  }

  const cancan = new CanCan2()

  const {allow, authorize} = cancan

  allow(aUser, 'read', publishedProducts)

  const user = new User()
  const privateProduct = new Product()
  const publicProduct = new Product({published: true})

  authorize(user, 'read', publicProduct)

  t.throws(() => authorize(user, 'read', privateProduct), AuthError, 'User couldn\'t read product')
})
