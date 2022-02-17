//@format
/*globals firestoreQueryParser*/

const byId = (id) => document.getElementById(id),
  EXAMPLES = {
    simple: 'a == 5',
    and: 'a <= 5 and b > 1.5 and c != "hello" and d array-contains [1, true, "hi"]',
    limit: 'a < 5 LIMIT 10',
    orderBy: 'a > 10 ORDER BY a',
    orderByMany: 'a > 10 ORDER BY a, b ASC, d DESC',
    orderByAndLimit: 'a > 10 ORDER BY a, b ASC, d DESC LIMIT 20',
  };
function main() {
  const parser = firestoreQueryParser,
    {astToSExpr, astToPlan} = parser,
    queryIn = byId('query'),
    parseBtn = byId('parse'),
    examplesSel = byId('examples'),
    errorOut = byId('error'),
    astOut = byId('ast'),
    sexprOut = byId('sexpr'),
    planOut = byId('plan'),
    codeOut = byId('code');

  function formatData(v) {
    return JSON.stringify(v, null, '  ');
  }

  function parse() {
    errorOut.style.display = 'none';
    const query = queryIn.value;
    let ast;

    try {
      ast = parser.parse(query);
    } catch (err) {
      errorOut.innerText = err.toString();
      errorOut.style.display = 'block';
    }

    const sexpr = astToSExpr(ast),
      plan = astToPlan(ast),
      code =
        'obj.' +
        plan
          .map(
            ([method, args]) =>
              `\n  .${method}(${args.map((v) => JSON.stringify(v)).join(', ')})`
          )
          .join('');

    astOut.value = formatData(ast);
    sexprOut.value = formatData(sexpr);
    planOut.value = formatData(plan);
    codeOut.value = code;
  }
  parseBtn.addEventListener('click', (_) => parse());
  queryIn.addEventListener('keyup', (e) => {
    if (e.ctrlKey && e.keyCode === 13) {
      parse();
    }
  });
  examplesSel.addEventListener('input', (e) => {
    const code = EXAMPLES[e.target.value];
    if (code) {
      queryIn.value = code;
      parse();
    }
  });
  examplesSel.value = '';

  parse();
}

window.addEventListener('load', main);