//@format
/*globals QUnit firestoreQueryParser*/
const parser = firestoreQueryParser;

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

function id(v) {
  return t('name', v);
}

function num(v) {
  return t('num', v);
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

QUnit.module('add', () => {
  QUnit.test('parse compExpr', (assert) => {
    assert.deepEqual(eq(id('a'), bool(false)), parser.parse('a == false'));
    assert.deepEqual(ne(id('asd'), bool(true)), parser.parse('asd != true'));
    assert.deepEqual(lt(id('a1'), num(1.5)), parser.parse('a1 < 1.5'));
    assert.deepEqual(le(id('a_A_1'), num(100)), parser.parse('a_A_1 <= 100'));
    assert.deepEqual(gt(id('ab12'), num(10.55)), parser.parse('ab12 > 10.55'));
    assert.deepEqual(
      ge(id('ab_AB_12'), str('asd')),
      parser.parse('ab_AB_12 >= "asd"')
    );
  });

  QUnit.test('parse boolExpr', (assert) => {
    assert.deepEqual(
      and(eq(id('a'), bool(false)), ne(id('b'), bool(true))),
      parser.parse('a == false and b != true')
    );

    assert.deepEqual(
      and(
        eq(id('a'), bool(false)),
        and(ne(id('b'), bool(true)), lt(id('c'), num(42)))
      ),
      parser.parse('a == false and b != true and c < 42')
    );
  });
});
