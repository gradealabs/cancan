class Deny {

}

/**
 * @typedef {Object} Fluent
 * @prop {{ (actions: string | string[]): FluentEnder }} to
 */

/**
 * @typedef {Object} FluentEnder
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
    this.deny = this.deny.bind(this)
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
    actions = [].concat(actions)
    const plural = actions.length > 1 ? 's' : ''
    return Object.assign(
      new Error(`Action${plural} ${actions.join(', ')} not permitted`),
      { actor, actions, target, name: 'AuthorizationError' }
    )
  }

  /**
   * Adds an ability for an actor to perform an action on a target.
   *
   * If action is 'manage' then any action will be allowed.
   *
   * When calling allow with just a predicate the fluent API is returned to make
   * it easy to add a new ability.
   *
   * @example
   * allow(actor => actor instanceof User, 'edit', target => target instanceof Product)
   * @example
   * const aUser = actor => actor instanceof User
   * const aProduct = target => target instanceof Product
   * allow(aUser).to('edit').on(aProduct)
   * @example
   * allow(anAdminUser).to('edit', 'read', 'delete').anything()
   * @param {{ (actor: any): boolean }} predicate The test to check an actor
   * @param {string | string[]} [actions] The actions that are being performed on the model
   * @param {{ (target: any, actor: any): boolean }} [condition] The test to check a target
   * @return {Fluent | this}
   */
  allow (predicate, actions, condition) {
    if (typeof predicate !== 'function') {
      throw new TypeError(
        `Expected predicate to be function, got ${typeof predicate}`
      )
    }

    // If only given a predicate then return the fluent API.
    if (!actions && !condition) {
      return this.fluent(predicate, this.allow)
    }

    condition = condition || function () { return true }
    const abilities = this.abilities

    ;[].concat(actions).forEach(function (action) {
      let tests = abilities[action] || []
      tests.push(function test (actor, target) {
        return predicate(actor) && condition(target, actor)
      })
      abilities[action] = tests
    })

    return this
  }

  /**
   * Denies the ability for an actor to perform an action on a target.
   *
   * If action is 'manage' then any action will be denied.
   *
   * When calling deny with just a predicate the fluent API is returned to make
   * it easy to deny a new ability.
   *
   * @example
   * deny(actor => actor instanceof User, 'edit', target => target instanceof Product)
   * @example
   * const aUser = actor => actor instanceof User
   * const aProduct = target => target instanceof Product
   * deny(aUser).to('edit').on(aProduct)
   * @example
   * deny(anAdminUser).to('edit', 'read', 'delete').anything()
   * @param {{ (actor: any): boolean }} predicate The test to check an actor
   * @param {string | string[]} [actions] The actions that are being performed on the model
   * @param {{ (target: any, actor: any): boolean }} [condition] The test to check a target
   * @return {Fluent | this}
   */
  deny (predicate, actions, condition) {
    if (typeof predicate !== 'function') {
      throw new TypeError(
        `Expected predicate to be function, got ${typeof predicate}`
      )
    }

    // If only given a predicate then return the fluent API.
    if (!actions && !condition) {
      return this.fluent(predicate, this.deny)
    }

    condition = condition || function () { return true }
    const abilities = this.abilities

    ;[].concat(actions).forEach(function (action) {
      let tests = abilities[action] || []
      tests.push(function test (actor, target) {
        const pass = predicate(actor) && condition(target, actor)
        return pass ? new Deny() : false
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
      const tests = [].concat(abilities[action], abilities['manage']).filter(Boolean)
      const pass = tests.reduce(function (pass, test) {
        if (pass instanceof Deny) {
          return pass
        } else if (pass === true) {
          return test(actor, target) || pass
        }
        return test(actor, target)
      }, false)
      return pass instanceof Deny ? false : pass
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

  /*
   * Performs an allow or deny call, but using the fluent API.
   *
   * @private
   * @param {{ (actor: any): boolean }} predicate The test to check an actor
   * @param {{ (...args): Fluent | this }} allowOrDeny allow or deny method
   * @return {Fluent} The fluent API object for allow
   */
  fluent (predicate, allowOrDeny) {
    const self = this
    let called = false
    return {
      to (...actions) {
        if (called) {
          throw new Error('Cannot call `to` more than once')
        }
        called = true
        actions = [].concat(...actions)
        let finished = false
        return {
          anything () {
            if (finished) {
              throw new Error('Cannot call `anything` more than once')
            }
            finished = true
            allowOrDeny.call(self, predicate, actions, function () { return true })
            return self
          },
          on (condition) {
            if (finished) {
              throw new Error('Cannot call `on` more than once')
            }
            finished = true
            if (typeof condition === 'function') {
              allowOrDeny.call(self, predicate, actions, condition)
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
}

/**
 * Combines several CanCan instances into a new instnace.
 *
 * @example
 * const canCan = CanCan.combine(productCanCan, postCanCan)
 * @return {CanCan} A new CanCan instance
 */
CanCan.combine = function (...canCans) {
  const abilities = canCans.reduce(function (abilities, canCan) {
    Object.keys(canCan.abilities).forEach(function (action) {
      abilities[action] = (abilities[action] || [])
        .concat(canCan.abilities[action])
    })
    return abilities
  }, {})

  return Object.assign(new CanCan(), { abilities })
}

module.exports = CanCan
