/**
 * @typedef {Object} FluentAllow
 * @prop {{ (actions: string | string[]): FluentAllowEnder }} to
 */

/**
 * @typedef {Object} FluentAllowEnder
 * @prop {{ (condition: (target: any, actor: any) => boolean): CanCan }} on
 * @prop {{ (): CanCan }} anything
 */

class CanCan {
  constructor () {
    /*
    A table whose keys are action names and values are an array of test
    functions that accept an actor and a target and return a boolean.

    HashMap<string, {{ (actor: any, target: any): boolean }}[]>
    */
    this.abilities = {}

    this.createAuthorizationError = this.createAuthorizationError.bind(this)
    this.allow = this.allow.bind(this)
    this.can = this.can.bind(this)
    this.cannot = this.cannot.bind(this)
    this.authorize = this.authorize.bind(this)
  }

  /**
   * Creates an AuthorizationError and sets the properties actor, actions and
   * target equal to the arguemnts passed in.
   *
   * @param {any} actor The actor performing the actions
   * @param {string | string[]} actions The actions being performed
   * @param {any} target The target on which the actions are being performed
   * @return {Error}
   */
  createAuthorizationError (actor, actions, target) {
    return Object.assign(
      new Error(`Actions ${[].concat(actions).join(', ')} not permitted`),
      { actor, actions, target, name: 'AuthorizationError' }
    )
  }

  /**
   * Allows an action to occur by an actor on a target. If target is 'all' then
   * any target will be allowed. If action is 'manage' then any action will
   * be allowed.
   *
   * When calling allow with just a predicate the fluent API is returned to make
   * it easy to add a new permission.
   *
   * @example
   * allow(actor => actor instnaceof User, 'edit', target => target instanceof Product)
   * @example
   * const aUser = actor => actor instnaceof User
   * const aProduct = target => target instanceof Product
   * allow(aUser).to('edit').on(aProduct)
   * @example
   * allow(anAdminUser).to('edit', 'read', 'delete').anything()
   * @param {{ (actor: any): boolean }} predicate
   * @param {string | string[]} [actions] The actions that are being performed on the model
   * @param {{ (target: any, actor: any, ): boolean }} [condition]
   * @return {FluentAllow | this}
   */
  allow (predicate, actions, condition) {
    const self = this

    if (typeof predicate !== 'function') {
      throw new TypeError(
        `Expected predicate to be function, got ${typeof predicate}`
      )
    }

    // If only given a predicate then return the fluent API.
    if (!actions && !condition) {
      let called = false
      return {
        to (/* ...actions */) {
          if (called) {
            throw new Error('Cannot call `to` more than once')
          }
          called = true
          const actions = [].concat.apply([], arguments)
          let finished = false
          return {
            anything () {
              if (finished) {
                throw new Error('Cannot call `anything` more than once')
              }
              finished = true
              self.allow(predicate, actions, function () { return true })
              return self
            },
            on (condition) {
              if (finished) {
                throw new Error('Cannot call `on` more than once')
              }
              finished = true
              if (typeof condition === 'function') {
                self.allow(predicate, actions, condition)
                return self
              } else {
                throw new Error(
                  `Expected condition to be function, got ${typeof condition}`
                )
              }
            }
          }
        }
      }
    }

    condition = condition || function () { return true }
    const abilities = this.abilities

    [].concat(actions).forEach(function (action) {
      let tests = abilities[action] || []
      tests.push(function test (actor, target) {
        return predicate(actor) && condition(target, actor)
      })
      abilities[action] = tests
    })

    return this
  }

  /**
   * Checks if an actor can perform actions on a target.
   *
   * @param {any} actor The actor performing the actions
   * @param {string | string[]} actions The actions being performed
   * @param {any} target The target on which the actions are being performed
   * @return {boolean} True if the actor is allowed to perform the actions on the target
   */
  can (actor, actions, target) {
    const abilities = this.abilities

    return [].concat(actions).every(function (action) {
      const tests = abilities[action] || abilities['manage']
      if (tests) {
        return tests.some(function (test) {
          return test(actor, target)
        })
      } else {
        return false
      }
    })
  }

  /**
   * Checks if an actor cannot perform actions on a target.
   *
   * @param {any} actor The actor performing the actions
   * @param {string | string[]} actions The actions being performed
   * @param {any} target The target on which the actions are being performed
   * @return {boolean} True if the actor is not allowed to perform the actions on the target
   */
  cannot (actor, actions, target) {
    return !this.can(actor, actions, target)
  }

  /**
   * Throws an AuthorizationError if an actor cannot perform actions on a target.
   *
   * The AuthorizationError has the following properties from the arguments:
   *
   * - actor
   * - actions
   * - target
   *
   * @param {any} actor The actor performing the actions
   * @param {string | string[]} actions The actions being performed
   * @param {any} target The target on which the actions are being performed
   */
  authorize (actor, actions, target) {
    if (this.cannot(actor, actions, target)) {
      throw this.createAuthorizationError(actor, actions, target)
    }
  }
}

module.exports = CanCan
