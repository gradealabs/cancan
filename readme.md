<h1 align="center">
	<br>
	<img width="200" src="media/logo.png">
	<br>
	<br>
	<br>
</h1>

[![Build Status](https://travis-ci.org/vadimdemedes/cancan.svg?branch=master)](https://travis-ci.org/vadimdemedes/cancan)

> Authorize easily.

CanCan provides a simple API for handling authorization of actions.
Permissions are defined and validated using simple `allow()` and `can()` functions respectively.

CanCan is inspired by Ryan Bates' [cancan](https://github.com/ryanb/cancan).


## Installation

```
$ npm install --save cancan
```


## Usage

```js
const CanCan = require('cancan');

const cancan = new CanCan();
const { allow, can } = cancan;

class User {}
class Product {}

const aUser = function (actor) { return actor instanceof User }
const aProduct = function (target) { return target instanceof Product }

allow(aUser, 'view', aProduct);

const user = new User();
const product = new Product();

can(user, 'view', product);
//=> true

can(user, 'edit', product);
//=> false
```


## API

### allow(predicate, [actions], [condition])

See jsdoc comments in source.

Examples:

```js
const aUser = user => user instanceof User
const aPost = post => post instanceof Post
const anEditor = user => aUser(editor) && user.roles.includes('editor')
const anAdminUser = user => aUser(user) && user.roles.includes('admin')
const publicPosts = post => aPost(post) && post.public
const ownedPosts = (post, user) => aPost(post) && aUser(user) && post.autherId === user.id

// allow users to view all public posts
allow(aUser, 'view', publicPosts);
// Or using the fluent API
allow(aUser).to('view').on(publicPosts);

// allow users to edit and delete their posts
allow(aUser, ['edit', 'delete'], ownedPosts);
// Or using the fluent API
allow(aUser).to('edit', 'delete').on(ownedPosts);

// allow editors to do anything with all posts
allow(anEditor, [ 'manage' ], aPost);
// Or using the fluent API
allow(anEditor).to('manage').on(aPost);

// allow admins to do anything with everything
allow(anAdminUser, 'manage', () => true);
// Or using the fluent API
allow(anAdminUser).to('manage').anything();
```

### can(actor, actions, target)

Checks if the action is possible on `target` by `actor`.

See jsdocs comments in source.

Examples:

```js
const user = new User();
const post = new Post();

can(user, 'view', post);
```

### cannot(actor, actions, target)

Inverse of `.can()`.

### authorize(actor, actions, target)

Same as `.can()`, but throws an error instead of returning `false`.


## License

MIT © [Vadim Demedes](https://github.com/vadimdemedes)
