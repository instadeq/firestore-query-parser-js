//@format
/*globals firestoreQueryParser*/

(function () {
  function astToSExpr(ast) {
    const {type, v, left, op, right} = ast;
    switch (type) {
      case 'boolExpr':
        return ['and', flattenAnds(right, [astToSExpr(left)])];
      case 'compExpr':
        return ['where', [astToSExpr(left), astToSExpr(op), astToSExpr(right)]];
      case 'compOp':
      case 'num':
      case 'bool':
      case 'str':
        return v;
      case 'array':
        return v.map((item) => astToSExpr(item));
      default:
        console.warn('unknown node type', ast);
        return v;
    }
  }

  function flattenAnds(ast, accum) {
    // it's and
    if (ast.op.v === 'and') {
      accum.push(astToSExpr(ast.left));
      return flattenAnds(ast.right, accum);
    } else {
      accum.push(astToSExpr(ast));
      return accum;
    }
  }

  function astToPlan(ast) {
    // since until now only and is supported we return the list of wheres if it's
    // and or wrap the single were in a list
    const sexpr = astToSExpr(ast);
    if (sexpr[0] === 'and') {
      return sexpr[1];
    } else {
      return [sexpr];
    }
  }

  function applyToQuery(query, ast) {
    for (let [method, params] of astToPlan(ast)) {
      query[method].apply(query, params);
    }
  }

  firestoreQueryParser.astToSExpr = astToSExpr;
  firestoreQueryParser.astToPlan = astToPlan;
  firestoreQueryParser.applyToQuery = applyToQuery;
})();
