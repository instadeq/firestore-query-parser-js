//@format
/*globals firestoreQueryParser*/

(function () {
  function astToPlan(ast) {
    const {type, v, left, op, right} = ast;
    switch (type) {
      case 'boolExpr':
        // it's and
        if (right.op.v === 'and') {
          return [astToPlan(left)].concat(astToPlan(right));
        } else {
          return [astToPlan(left), astToPlan(right)];
        }
      case 'compExpr':
        return ['where', [astToPlan(left), astToPlan(op), astToPlan(right)]];
      case 'compOp':
      case 'num':
      case 'bool':
      case 'str':
        return v;
      case 'array':
        return v.map((item) => astToPlan(item));
      default:
        console.warn('unknown node type', ast);
        return v;
    }
  }
  firestoreQueryParser.astToPlan = astToPlan;
})();
