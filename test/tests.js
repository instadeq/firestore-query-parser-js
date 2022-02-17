//@format
/*globals QUnit firestoreQueryParser*/
const parser = firestoreQueryParser,
  {astToSExpr, astToPlan, applyToQuery} = parser;

function mkComp(op) {
  return function (left, right) {
    return compExpr(left, compOp(op), right);
  };
}

function mkBool(op) {
  return function (left, right) {
    return boolExpr(left, boolOp(op), right);
  };
}

const eq = mkComp('=='),
  ne = mkComp('!='),
  lt = mkComp('<'),
  le = mkComp('<='),
  gt = mkComp('>'),
  ge = mkComp('>=');

const and = mkBool('and');

function q(where) {
  return qol(where, [], null);
}

function qol(where, order, limit) {
  return {where, order, limit};
}

function sortAsc(v) {
  return sort(v, 'ASC');
}

function sortDesc(v) {
  return sort(v, 'DESC');
}

function sort(v, type) {
  return {v, type};
}

const arrContains = mkComp('array-contains'),
  arrContainsAny = mkComp('array-contains-any'),
  arrIn = mkComp('in'),
  arrNotIn = mkComp('not-in');

function id(v) {
  return t('name', v);
}

function float(v) {
  return t('float', v);
}

function int(v) {
  return t('int', v);
}

function array(...v) {
  return t('array', v);
}

function str(v) {
  return t('str', v);
}

function bool(v) {
  return t('bool', v);
}

function compOp(v) {
  return t('compOp', v);
}

function boolOp(v) {
  return t('boolOp', v);
}

function t(type, v) {
  return {type, v};
}

function compExpr(left, op, right) {
  return {type: 'compExpr', left, op, right};
}

function boolExpr(left, op, right) {
  return {type: 'boolExpr', left, op, right};
}

class MockQuery {
  constructor(ops) {
    this.ops = ops || [];
  }
  where(left, op, right) {
    return this.withOp('where', [left, op, right]);
  }
  limit(num) {
    return this.withOp('limit', [num]);
  }
  orderBy(name, type) {
    return this.withOp('orderBy', [name, type]);
  }
  withOp(name, args) {
    return new MockQuery(this.ops.concat([[name, args]]));
  }
}

QUnit.module('firebaseQueryParser', () => {
  QUnit.test('parse compExpr', (assert) => {
    assert.deepEqual(q(eq(id('a'), bool(false))), parser.parse('a == false'));
    assert.deepEqual(q(ne(id('asd'), bool(true))), parser.parse('asd != true'));
    assert.deepEqual(q(lt(id('a1'), float(1.5))), parser.parse('a1 < 1.5'));
    assert.deepEqual(
      q(le(id('a_A_1'), int(100))),
      parser.parse('a_A_1 <= 100')
    );
    assert.deepEqual(
      q(gt(id('ab12'), float(10.55))),
      parser.parse('ab12 > 10.55')
    );
    assert.deepEqual(
      q(ge(id('ab_AB_12'), str('asd'))),
      parser.parse('ab_AB_12 >= "asd"')
    );
  });

  QUnit.test('parse array compExpr', (assert) => {
    assert.deepEqual(
      q(arrContains(id('a'), array())),
      parser.parse('a array-contains []')
    );
    assert.deepEqual(
      q(arrContainsAny(id('a'), array())),
      parser.parse('a array-contains-any []')
    );
    assert.deepEqual(q(arrIn(id('a'), array())), parser.parse('a in []'));
    assert.deepEqual(
      q(arrNotIn(id('a'), array())),
      parser.parse('a not-in []')
    );

    assert.deepEqual(
      q(arrContains(id('a'), array(int(1)))),
      parser.parse('a array-contains [1]')
    );

    assert.deepEqual(
      q(arrContains(id('a'), array(int(1), bool(true)))),
      parser.parse('a array-contains [1, true]')
    );

    assert.deepEqual(
      q(arrContains(id('a'), array(int(1), bool(true), str('hi')))),
      parser.parse('a array-contains [1, true, "hi"]')
    );
  });

  QUnit.test('parse boolExpr', (assert) => {
    assert.deepEqual(
      q(and(eq(id('a'), bool(false)), ne(id('b'), bool(true)))),
      parser.parse('a == false and b != true')
    );

    assert.deepEqual(
      q(
        and(
          eq(id('a'), bool(false)),
          and(ne(id('b'), bool(true)), lt(id('c'), int(42)))
        )
      ),
      parser.parse('a == false and b != true and c < 42')
    );
  });

  QUnit.test('parse limit', (assert) => {
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [], 10),
      parser.parse('a == false LIMIT 10')
    );
  });

  QUnit.test('parse order by', (assert) => {
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a')], null),
      parser.parse('a == false ORDER BY a')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a')], null),
      parser.parse('a == false ORDER BY a ASC')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a')], null),
      parser.parse('a == false ORDER BY a DESC')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a'), sortAsc('b')], null),
      parser.parse('a == false ORDER BY a DESC, b')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a'), sortAsc('b')], null),
      parser.parse('a == false ORDER BY a DESC, b ASC')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a'), sortAsc('b')], null),
      parser.parse('a == false ORDER BY a, b ASC')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortDesc('c')],
        null
      ),
      parser.parse('a == false ORDER BY a, b ASC, c DESC')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortDesc('c')],
        null
      ),
      parser.parse('a == false ORDER BY a, b, c DESC')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortAsc('c')],
        null
      ),
      parser.parse('a == false ORDER BY a, b, c')
    );
  });

  QUnit.test('parse order by limit', (assert) => {
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a')], 10),
      parser.parse('a == false ORDER BY a LIMIT 10')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a')], 11),
      parser.parse('a == false ORDER BY a ASC LIMIT 11')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a')], 1),
      parser.parse('a == false ORDER BY a DESC LIMIT 1')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a'), sortAsc('b')], 100),
      parser.parse('a == false ORDER BY a DESC, b LIMIT 100')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a'), sortAsc('b')], 13),
      parser.parse('a == false ORDER BY a DESC, b ASC LIMIT 13')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a'), sortAsc('b')], 410),
      parser.parse('a == false ORDER BY a, b ASC LIMIT 410')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortDesc('c')],
        1000
      ),
      parser.parse('a == false ORDER BY a, b ASC, c DESC LIMIT 1000')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortDesc('c')],
        120
      ),
      parser.parse('a == false ORDER BY a, b, c DESC LIMIT 120')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortAsc('c')],
        10
      ),
      parser.parse('a == false ORDER BY a, b, c LIMIT 10')
    );
  });

  QUnit.test('astToSExpr', (assert) => {
    assert.deepEqual(
      [['where', ['a', '==', false]]],
      astToSExpr(parser.parse('a == false'))
    );

    assert.deepEqual(
      [
        [
          'and',
          [
            ['where', ['a', '==', false]],
            ['where', ['b', '!=', true]],
          ],
        ],
      ],
      astToSExpr(parser.parse('a == false and b != true'))
    );

    assert.deepEqual(
      [
        [
          'and',
          [
            ['where', ['a', '==', false]],
            ['where', ['b', '!=', true]],
            ['where', ['c', '<', 42]],
          ],
        ],
      ],
      astToSExpr(parser.parse('a == false and b != true and c < 42'))
    );
    assert.deepEqual(
      [
        [
          'and',
          [
            ['where', ['a', '==', false]],
            ['where', ['b', '!=', true]],
            ['where', ['c', '<', 42]],
            ['where', ['d', 'not-in', [42, true, 'hi']]],
          ],
        ],
      ],
      astToSExpr(
        parser.parse(
          'a == false and b != true and c < 42 and d not-in [42, true, "hi"]'
        )
      )
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['limit', 5],
      ],
      astToSExpr(parser.parse('a == false LIMIT 5'))
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['orderBy', [['a', 'asc']]],
      ],
      astToSExpr(parser.parse('a == false ORDER BY a ASC'))
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        [
          'orderBy',
          [
            ['a', 'asc'],
            ['b', 'desc'],
          ],
        ],
      ],
      astToSExpr(parser.parse('a == false ORDER BY a, b DESC'))
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['orderBy', [['a', 'asc']]],
        ['limit', 5],
      ],
      astToSExpr(parser.parse('a == false ORDER BY a ASC LIMIT 5'))
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        [
          'orderBy',
          [
            ['a', 'asc'],
            ['b', 'desc'],
          ],
        ],
        ['limit', 5],
      ],
      astToSExpr(parser.parse('a == false ORDER BY a, b DESC LIMIT 5'))
    );
  });

  QUnit.test('astToPlan', (assert) => {
    assert.deepEqual(
      [['where', ['a', '==', false]]],
      astToPlan(parser.parse('a == false'))
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
      ],
      astToPlan(parser.parse('a == false and b != true'))
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
        ['where', ['c', '<', 42]],
      ],
      astToPlan(parser.parse('a == false and b != true and c < 42'))
    );
    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
        ['where', ['c', '<', 42]],
        ['where', ['d', 'not-in', [42, true, 'hi']]],
      ],
      astToPlan(
        parser.parse(
          'a == false and b != true and c < 42 and d not-in [42, true, "hi"]'
        )
      )
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['limit', [6]],
      ],
      astToPlan(parser.parse('a == false LIMIT 6'))
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['orderBy', ['a', 'asc']],
        ['limit', [6]],
      ],
      astToPlan(parser.parse('a == false ORDER BY a LIMIT 6'))
    );

    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['limit', [6]],
      ],
      astToPlan(parser.parse('a == false ORDER BY a, b DESC LIMIT 6'))
    );
    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['orderBy', ['c', 'asc']],
      ],
      astToPlan(parser.parse('a == false ORDER BY a, b DESC, c ASC'))
    );
    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['where', ['b', '==', 5]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['orderBy', ['c', 'asc']],
        ['limit', [6]],
      ],
      astToPlan(
        parser.parse('a == false and b == 5 ORDER BY a, b DESC, c ASC LIMIT 6')
      )
    );
  });

  QUnit.test('applyToQuery', (assert) => {
    const q1 = applyToQuery(new MockQuery(), parser.parse('a == false'));
    assert.deepEqual([['where', ['a', '==', false]]], q1.ops);

    const q2 = applyToQuery(
      new MockQuery(),
      parser.parse('a == false and b != true')
    );
    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
      ],
      q2.ops
    );

    const q3 = applyToQuery(
      new MockQuery(),
      parser.parse('a == false and b != true and c < 42')
    );
    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
        ['where', ['c', '<', 42]],
      ],
      q3.ops
    );

    const q4 = applyToQuery(
      new MockQuery(),
      parser.parse(
        'a == false and b != true and c < 42 and d not-in [42, true, "hi"]'
      )
    );
    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
        ['where', ['c', '<', 42]],
        ['where', ['d', 'not-in', [42, true, 'hi']]],
      ],
      q4.ops
    );

    const q5 = applyToQuery(
      new MockQuery(),
      parser.parse('a == false and b == 5 ORDER BY a, b DESC, c ASC LIMIT 6')
    );
    assert.deepEqual(
      [
        ['where', ['a', '==', false]],
        ['where', ['b', '==', 5]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['orderBy', ['c', 'asc']],
        ['limit', [6]],
      ],
      q5.ops
    );
  });
});
