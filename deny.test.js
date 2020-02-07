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

test('deny one action', t => {
  const cancan = new CanCan()
  const {can, allow, cannot, deny} = cancan

  allow(aUser).to('manage').on(aProduct)
  deny(aUser).to('read').on(aProduct)

  const user = new User()
  const product = new Product()

  t.false(can(user, 'read', product))
  t.true(cannot(user, 'read', product))
  t.true(can(user, 'create', product))
  t.false(cannot(user, 'create', product))
})

test('deny many actions', t => {
  const cancan = new CanCan()
  const {can, cannot, allow, deny} = cancan

  allow(aUser, 'manage', aProduct)
  deny(aUser, ['create', 'destroy'], aProduct)

  const user = new User()
  const product = new Product()

  t.true(cannot(user, 'destroy', product))
  t.true(cannot(user, 'create', product))
  t.true(can(user, 'read', product))
})

test('deny all actions using "manage"', t => {
  const cancan = new CanCan()
  const {cannot, allow, deny} = cancan

  allow(aUser, 'read', anAdminUser)
  deny(aUser, 'manage', aProduct)

  const user = new User()
  const product = new Product()

  t.true(cannot(user, 'read', product))
  t.true(cannot(user, 'create', product))
  t.true(cannot(user, 'update', product))
  t.true(cannot(user, 'destroy', product))
  t.true(cannot(user, 'modify', product))
})

test('deny all actions and all objects', t => {
  const cancan = new CanCan()
  const {cannot, allow, deny} = cancan

  allow(aUser, 'manage', aProduct)
  allow(aUser, 'manage', aUser)
  deny(aUser, 'manage', () => true)

  const user = new User()
  const product = new Product()

  t.true(cannot(user, 'read', user))
  t.true(cannot(user, 'read', product))
  t.true(cannot(user, 'modify', user))
  t.true(cannot(user, 'modify', product))
  t.true(cannot(user, 'manage', user))
  t.true(cannot(user, 'manage', product))
})

test('deny only objects that satisfy given condition', t => {
  const cancan = new CanCan()
  const {cannot, allow, deny} = cancan

  allow(aUser, 'manage', () => true)
  deny(aUser, 'read', publishedProducts)

  const user = new User()
  const privateProduct = new Product()
  const publicProduct = new Product({published: true})

  t.false(cannot(user, 'read', privateProduct))
  t.true(cannot(user, 'read', publicProduct))
})

test('deny only when performer passes a condition', t => {
  const cancan = new CanCan()
  const {can, cannot, allow, deny} = cancan

  allow(anAdminUser, 'manage', () => true)
  deny(anAdminUser, 'read', aProduct)

  const adminUser = new User({admin: true})
  const product = new Product()

  t.true(can(adminUser, 'write', product))
  t.true(can(adminUser, 'write', aUser))
  t.true(can(adminUser, 'read', aUser))
  t.true(cannot(adminUser, 'read', product))
})

test('deny only when target passes a condition', t => {
  const cancan = new CanCan()
  const {can, cannot, allow, deny} = cancan

  allow(aUser, 'manage', () => true)
  deny(aUser, 'read', publishedProducts)

  const user = new User()
  const privateProduct = new Product()
  const publicProduct = new Product({published: true})

  t.true(can(user, 'read', privateProduct))
  t.true(cannot(user, 'read', publicProduct))
})
