//@format
/*globals firestoreQueryParser*/

(function () {
  function astToSExpr(ast) {
    const root = fromToSExpr(ast.from);

    root.push(whereToSExpr(ast.where));

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

  const FROM_TYPE_TO_NAME = {
    COLLECTION: 'collection',
    COLGROUP: 'collectionGroup',
    DOC: 'doc',
  };
  function fromToSExpr(items) {
    return items.map(({type, v}) => [FROM_TYPE_TO_NAME[type], v]);
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
    const items = astToSExpr(ast),
      plan = [];

    for (let expr of items) {
      const [head, second] = expr;
      if (head === 'and') {
        for (let where of second) {
          plan.push(where);
        }
      } else if (head === 'where') {
        plan.push(expr);
      } else if (head === 'orderBy') {
        for (let order of second) {
          plan.push(['orderBy', order]);
        }
      } else if (!Array.isArray(second)) {
        plan.push([head, [second]]);
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
