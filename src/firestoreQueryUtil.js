//@format
/*globals firestoreQueryParser*/

(function () {
  function astToSExpr(ast) {
    const root = [whereToSExpr(ast.where)];
    if (ast.order.length > 0) {
      root.push([
        'orderBy',
        ast.order.map(({v, type}) => [v, type.toLowerCase()]),
      ]);
    }
    if (ast.limit !== null) {
      root.push(['limit', ast.limit]);
    }
    return root;
  }

  function whereToSExpr(ast) {
    const {type, v, left, op, right} = ast;
    switch (type) {
      case 'boolExpr':
        return ['and', flattenAnds(right, [whereToSExpr(left)])];
      case 'compExpr':
        return [
          'where',
          [whereToSExpr(left), whereToSExpr(op), whereToSExpr(right)],
        ];
      case 'compOp':
      case 'int':
      case 'float':
      case 'bool':
      case 'str':
        return v;
      case 'array':
        return v.map((item) => whereToSExpr(item));
      default:
        console.warn('unknown node type', ast);
        return v;
    }
  }

  function flattenAnds(ast, accum) {
    if (ast.op.v === 'and') {
      accum.push(whereToSExpr(ast.left));
      return flattenAnds(ast.right, accum);
    } else {
      accum.push(whereToSExpr(ast));
      return accum;
    }
  }

  function astToPlan(ast) {
    const [where, ...rest] = astToSExpr(ast),
      plan = where[0] === 'and' ? where[1] : [where];

    for (let expr of rest) {
      if (expr[0] === 'orderBy') {
        for (let order of expr[1]) {
          plan.push(['sortBy', order]);
        }
      } else if (expr[0] === 'limit') {
        plan.push(['limit', [expr[1]]]);
      } else {
        plan.push(expr);
      }
    }

    return plan;
  }

  function applyToQuery(query, ast) {
    for (let [method, params] of astToPlan(ast)) {
      query = query[method].apply(query, params);
    }
    return query;
  }

  firestoreQueryParser.astToSExpr = astToSExpr;
  firestoreQueryParser.astToPlan = astToPlan;
  firestoreQueryParser.applyToQuery = applyToQuery;
})();
