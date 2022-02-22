# Firestore Query Parser JS

A JS (jison) parser for a textual SQL-like format for firestore query language

## Build

```sh
npm install
make dist
```

Check `dist` folder

## Test

Open `test/index.html` in your browser

## Use

Try the [Playground](https://instadeq.github.io/firestore-query-parser-js/playground.html)

Check `test/tests.js` for usage examples, but basically:

```js
// return the query's AST
const ast = firestoreQueryParser.parse(
    'FROM "coll" WHERE a == false and b != true and c < 42 and d not-in [42, true, "hi"]'
)

// this
firestoreQueryParser.astToSExpr(ast);
// will return something like this, useful for debugging:
[
  ['collection', 'coll'],
  ['and',
    [
      ['where', ['a', '==', false]],
      ['where', ['b', '!=', true]],
      ['where', ['c', '<', 42]],
      ['where', ['d', 'not-in', [42, true, 'hi']]],
    ]
  ]
]

// this
firestoreQueryParser.astToPlan(ast);
// will return something like this, useful to apply it to the firestore query:
[
  ['collection', 'coll'],
  ['where', ['a', '==', false]],
  ['where', ['b', '!=', true]],
  ['where', ['c', '<', 42]],
  ['where', ['d', 'not-in', [42, true, 'hi']]],
]

// or you can just apply it to your query object:
firestoreQueryParser.applyToQuery(firestore, ast);
```

## Author

[Instadeq](https://instadeq.com)

## License

MIT
