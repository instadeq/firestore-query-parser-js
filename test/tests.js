//@format
/*globals QUnit firestoreQueryParser*/
const parser = firestoreQueryParser,
  {astToSExpr, astToPlan, applyToQuery, Var} = parser;

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
  return fq([{type: 'COLLECTION', v: 'a'}], where, order, limit);
}

function fq(from, where, order, limit) {
  return {from, where, order: order || [], limit: limit || null};
}

function col(v) {
  return {type: 'COLLECTION', v};
}

function colg(v) {
  return {type: 'COLGROUP', v};
}

function doc(v) {
  return {type: 'DOC', v};
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

function vr(v) {
  return t('var', v);
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
  collection(v) {
    return this.withOp('collection', [v]);
  }
  collectionGroup(v) {
    return this.withOp('collectionGroup', [v]);
  }
  doc(v) {
    return this.withOp('doc', [v]);
  }
  withOp(name, args) {
    return new MockQuery(this.ops.concat([[name, args]]));
  }
}

function parseExpr(expr) {
  return parser.parse('FROM "a" WHERE ' + expr);
}

function parse(expr) {
  return parser.parse(expr);
}

QUnit.module('firebaseQueryParser', () => {
  QUnit.test('parse compExpr', (assert) => {
    assert.deepEqual(q(eq(id('a'), bool(false))), parseExpr('a == false'));
    assert.deepEqual(q(ne(id('asd'), bool(true))), parseExpr('asd != true'));
    assert.deepEqual(q(lt(id('a1'), float(1.5))), parseExpr('a1 < 1.5'));
    assert.deepEqual(q(le(id('a_A_1'), int(100))), parseExpr('a_A_1 <= 100'));
    assert.deepEqual(
      q(le(id('a_A_1'), vr('myVar'))),
      parseExpr('a_A_1 <= ${myVar}')
    );
    assert.deepEqual(
      q(gt(id('ab12'), float(10.55))),
      parseExpr('ab12 > 10.55')
    );
    assert.deepEqual(
      q(ge(id('ab_AB_12'), str('asd'))),
      parseExpr('ab_AB_12 >= "asd"')
    );
  });

  QUnit.test('parse array compExpr', (assert) => {
    assert.deepEqual(
      q(arrContains(id('a'), array())),
      parseExpr('a array-contains []')
    );
    assert.deepEqual(
      q(arrContainsAny(id('a'), array())),
      parseExpr('a array-contains-any []')
    );
    assert.deepEqual(q(arrIn(id('a'), array())), parseExpr('a in []'));
    assert.deepEqual(q(arrNotIn(id('a'), array())), parseExpr('a not-in []'));

    assert.deepEqual(
      q(arrContains(id('a'), array(int(1)))),
      parseExpr('a array-contains [1]')
    );

    assert.deepEqual(
      q(arrContains(id('a'), array(int(1), bool(true)))),
      parseExpr('a array-contains [1, true]')
    );

    assert.deepEqual(
      q(arrContains(id('a'), array(int(1), bool(true), str('hi')))),
      parseExpr('a array-contains [1, true, "hi"]')
    );

    assert.deepEqual(
      q(
        arrContains(
          id('a'),
          array(int(1), bool(true), str('hi'), vr('my_var1'))
        )
      ),
      parseExpr('a array-contains [1, true, "hi", ${my_var1}]')
    );
  });

  QUnit.test('parse boolExpr', (assert) => {
    assert.deepEqual(
      q(and(eq(id('a'), bool(false)), ne(id('b'), bool(true)))),
      parseExpr('a == false and b != true')
    );

    assert.deepEqual(
      q(
        and(
          eq(id('a'), bool(false)),
          and(ne(id('b'), bool(true)), lt(id('c'), int(42)))
        )
      ),
      parseExpr('a == false and b != true and c < 42')
    );
  });

  QUnit.test('parse limit', (assert) => {
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [], 10),
      parseExpr('a == false LIMIT 10')
    );
  });

  QUnit.test('parse order by', (assert) => {
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a')], null),
      parseExpr('a == false ORDER BY a')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a')], null),
      parseExpr('a == false ORDER BY a ASC')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a')], null),
      parseExpr('a == false ORDER BY a DESC')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a'), sortAsc('b')], null),
      parseExpr('a == false ORDER BY a DESC, b')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a'), sortAsc('b')], null),
      parseExpr('a == false ORDER BY a DESC, b ASC')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a'), sortAsc('b')], null),
      parseExpr('a == false ORDER BY a, b ASC')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortDesc('c')],
        null
      ),
      parseExpr('a == false ORDER BY a, b ASC, c DESC')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortDesc('c')],
        null
      ),
      parseExpr('a == false ORDER BY a, b, c DESC')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortAsc('c')],
        null
      ),
      parseExpr('a == false ORDER BY a, b, c')
    );
  });

  QUnit.test('parse order by limit', (assert) => {
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a')], 10),
      parseExpr('a == false ORDER BY a LIMIT 10')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a')], 11),
      parseExpr('a == false ORDER BY a ASC LIMIT 11')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a')], 1),
      parseExpr('a == false ORDER BY a DESC LIMIT 1')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a'), sortAsc('b')], 100),
      parseExpr('a == false ORDER BY a DESC, b LIMIT 100')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortDesc('a'), sortAsc('b')], 13),
      parseExpr('a == false ORDER BY a DESC, b ASC LIMIT 13')
    );
    assert.deepEqual(
      qol(eq(id('a'), bool(false)), [sortAsc('a'), sortAsc('b')], 410),
      parseExpr('a == false ORDER BY a, b ASC LIMIT 410')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortDesc('c')],
        1000
      ),
      parseExpr('a == false ORDER BY a, b ASC, c DESC LIMIT 1000')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortDesc('c')],
        120
      ),
      parseExpr('a == false ORDER BY a, b, c DESC LIMIT 120')
    );
    assert.deepEqual(
      qol(
        eq(id('a'), bool(false)),
        [sortAsc('a'), sortAsc('b'), sortAsc('c')],
        10
      ),
      parseExpr('a == false ORDER BY a, b, c LIMIT 10')
    );
  });

  QUnit.test('astToSExpr', (assert) => {
    assert.deepEqual(
      [
        ['collection', 'a'],
        ['where', ['a', '==', false]],
      ],
      astToSExpr(parseExpr('a == false'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        ['where', ['a', '==', new Var('v1')]],
      ],
      astToSExpr(parseExpr('a == ${v1}'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        ['where', ['a', '==', new Var('1')]],
      ],
      astToSExpr(parseExpr('a == ${1}'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        ['where', ['a', '==', new Var(' v 1 ')]],
      ],
      astToSExpr(parseExpr('a == ${ v 1 }'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        [
          'and',
          [
            ['where', ['a', '==', false]],
            ['where', ['b', '!=', true]],
          ],
        ],
      ],
      astToSExpr(parseExpr('a == false and b != true'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        [
          'and',
          [
            ['where', ['a', '==', false]],
            ['where', ['b', '!=', true]],
            ['where', ['c', '<', 42]],
          ],
        ],
      ],
      astToSExpr(parseExpr('a == false and b != true and c < 42'))
    );
    assert.deepEqual(
      [
        ['collection', 'a'],
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
        parseExpr(
          'a == false and b != true and c < 42 and d not-in [42, true, "hi"]'
        )
      )
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        ['where', ['a', '==', false]],
        ['limit', 5],
      ],
      astToSExpr(parseExpr('a == false LIMIT 5'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        ['where', ['a', '==', false]],
        ['orderBy', [['a', 'asc']]],
      ],
      astToSExpr(parseExpr('a == false ORDER BY a ASC'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        ['where', ['a', '==', false]],
        [
          'orderBy',
          [
            ['a', 'asc'],
            ['b', 'desc'],
          ],
        ],
      ],
      astToSExpr(parseExpr('a == false ORDER BY a, b DESC'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
        ['where', ['a', '==', false]],
        ['orderBy', [['a', 'asc']]],
        ['limit', 5],
      ],
      astToSExpr(parseExpr('a == false ORDER BY a ASC LIMIT 5'))
    );

    assert.deepEqual(
      [
        ['collection', 'a'],
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
      astToSExpr(parseExpr('a == false ORDER BY a, b DESC LIMIT 5'))
    );
  });

  QUnit.test('astToPlan', (assert) => {
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
      ],
      astToPlan(parseExpr('a == false'))
    );

    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
      ],
      astToPlan(parseExpr('a == false and b != true'))
    );

    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
        ['where', ['c', '<', 42]],
      ],
      astToPlan(parseExpr('a == false and b != true and c < 42'))
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
        ['where', ['c', '<', 42]],
        ['where', ['d', 'not-in', [42, true, 'hi']]],
      ],
      astToPlan(
        parseExpr(
          'a == false and b != true and c < 42 and d not-in [42, true, "hi"]'
        )
      )
    );

    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['limit', [6]],
      ],
      astToPlan(parseExpr('a == false LIMIT 6'))
    );

    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['orderBy', ['a', 'asc']],
        ['limit', [6]],
      ],
      astToPlan(parseExpr('a == false ORDER BY a LIMIT 6'))
    );

    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['limit', [6]],
      ],
      astToPlan(parseExpr('a == false ORDER BY a, b DESC LIMIT 6'))
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['orderBy', ['c', 'asc']],
      ],
      astToPlan(parseExpr('a == false ORDER BY a, b DESC, c ASC'))
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['where', ['b', '==', 5]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['orderBy', ['c', 'asc']],
        ['limit', [6]],
      ],
      astToPlan(
        parseExpr('a == false and b == 5 ORDER BY a, b DESC, c ASC LIMIT 6')
      )
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['collectionGroup', ['b']],
        ['doc', ['c']],
        ['where', ['a', '==', false]],
        ['where', ['b', '==', 5]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['orderBy', ['c', 'asc']],
        ['limit', [6]],
      ],
      astToPlan(
        parse(
          'FROM COLLECTION "a", COLGROUP "b", DOC "c" WHERE a == false and b == 5 ORDER BY a, b DESC, c ASC LIMIT 6'
        )
      )
    );
  });

  QUnit.test('applyToQuery', (assert) => {
    const q1 = applyToQuery(new MockQuery(), parseExpr('a == false'));
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
      ],
      q1.ops
    );

    const q2 = applyToQuery(
      new MockQuery(),
      parseExpr('a == false and b != true')
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
      ],
      q2.ops
    );

    const q3 = applyToQuery(
      new MockQuery(),
      parseExpr('a == false and b != true and c < 42')
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
        ['where', ['c', '<', 42]],
      ],
      q3.ops
    );

    const q4 = applyToQuery(
      new MockQuery(),
      parseExpr(
        'a == false and b != true and c < 42 and d not-in [42, true, "hi"]'
      )
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['where', ['b', '!=', true]],
        ['where', ['c', '<', 42]],
        ['where', ['d', 'not-in', [42, true, 'hi']]],
      ],
      q4.ops
    );

    const q5 = applyToQuery(
      new MockQuery(),
      parseExpr('a == false and b == 5 ORDER BY a, b DESC, c ASC LIMIT 6')
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', false]],
        ['where', ['b', '==', 5]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['orderBy', ['c', 'asc']],
        ['limit', [6]],
      ],
      q5.ops
    );

    const q6 = applyToQuery(
      new MockQuery(),
      parse(
        'FROM "a", COLGROUP "b", DOC "c" WHERE a == false and b == 5 ORDER BY a, b DESC, c ASC LIMIT 6'
      )
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['collectionGroup', ['b']],
        ['doc', ['c']],
        ['where', ['a', '==', false]],
        ['where', ['b', '==', 5]],
        ['orderBy', ['a', 'asc']],
        ['orderBy', ['b', 'desc']],
        ['orderBy', ['c', 'asc']],
        ['limit', [6]],
      ],
      q6.ops
    );

    const q7 = applyToQuery(
      new MockQuery(),
      parseExpr(
        'a == ${v1} and b != ${v2} and c < 42 and d not-in [42, true, ${v3}]'
      ),
      {v1: 99, v2: 'asd', v3: false}
    );
    assert.deepEqual(
      [
        ['collection', ['a']],
        ['where', ['a', '==', 99]],
        ['where', ['b', '!=', 'asd']],
        ['where', ['c', '<', 42]],
        ['where', ['d', 'not-in', [42, true, false]]],
      ],
      q7.ops
    );
  });

  QUnit.test('parse from', (assert) => {
    assert.deepEqual(
      fq([col('c1')], eq(id('a'), int(1))),
      parse('FROM "c1" WHERE a == 1')
    );
    assert.deepEqual(
      fq([colg('cg')], eq(id('a'), int(1))),
      parse('FROM COLGROUP "cg" WHERE a == 1')
    );
    assert.deepEqual(
      fq([doc('d1')], eq(id('a'), int(1))),
      parse('FROM DOC "d1" WHERE a == 1')
    );
    assert.deepEqual(
      fq([col('c1'), colg('cg'), doc('d1')], eq(id('a'), int(1))),
      parse('FROM COLLECTION "c1", COLGROUP "cg", DOC "d1" WHERE a == 1')
    );
    assert.deepEqual(
      fq(
        [col('c1'), colg('cg'), doc('d1'), col('c2'), colg('cg2'), doc('d2')],
        eq(id('a'), int(1))
      ),
      parse(
        'FROM "c1", COLGROUP "cg", DOC "d1", COLLECTION "c2", COLGROUP "cg2", DOC "d2" WHERE a == 1'
      )
    );
  });

  QUnit.test('applyToQuery calls onVarNotFound', (assert) => {
    const names = [];
    applyToQuery(
      new MockQuery(),
      parseExpr(
        'a == ${v1} and b != ${v2} and c < 42 and d not-in [42, true, ${v3}]'
      ),
      {v1: 99},
      (name) => {
        names.push(name);
      }
    );
    assert.deepEqual([new Var('v2'), new Var('v3')], names);
  });
});
