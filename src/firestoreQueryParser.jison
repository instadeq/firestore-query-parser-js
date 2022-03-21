/* description: Parses and firebase query expressions. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
[0-9]+"."[0-9]+\b     return 'FLOAT';
[0-9]+\b              return 'INT';
(true|false)          return 'BOOL';
and                   return 'and';
'"'("\\"["]|[^"])*'"' return 'STRING';
'${'[a-zA-Z0-9 ][a-zA-Z0-9_ ]*'}'           return 'VAR';

"FROM"                return 'FROM';
"WHERE"               return 'WHERE';
"DOC"                 return 'DOC';
"COLLECTION"          return 'COLLECTION';
"COLGROUP"            return 'COLGROUP';
"ORDER"               return 'ORDER';
"BY"                  return 'BY';
"LIMIT"               return 'LIMIT';
"ASC"                 return 'ASC';
"DESC"                return 'DESC';
"["                   return '[';
"]"                   return ']';
","                   return ',';

"<="                  return '<=';
"<"                   return '<';
"=="                  return '==';
">="                  return '>=';
">"                   return '>';
"!="                  return '!=';

"array-contains-any"  return 'array-contains-any';
"array-contains"      return 'array-contains';
"in"                  return 'in';
"not-in"              return 'not-in';

[a-zA-Z]{1,}[a-zA-Z0-9_]* return 'IDENTIFIER';
<<EOF>>               return 'EOF';
.                     return 'INVALID';

/lex

%start expressions

%% /* language grammar */

expressions
    : fromExpr 'WHERE' boolExpr orderLimit EOF {return {from: $1, where: $3, order: $4.order, limit: $4.limit};}
    | fromExpr 'WHERE' boolExpr EOF {return {from: $1, where: $3, order: [], limit: null};}
    ;

fromExpr
    : 'FROM' fromVals {$$ = $2}
    ;

fromVals
    : STRING ',' fromVals           {$$ = [{type: "COLLECTION", v: JSON.parse($1)}].concat($3);}
    | fromType STRING ',' fromVals  {$$ = [{type: $1, v: JSON.parse($2)}].concat($4);}
    | STRING                        {$$ = [{type: "COLLECTION", v: JSON.parse($1)}];}
    | fromType STRING               {$$ = [{type: $1, v: JSON.parse($2)}];}
    ;

fromType
    : 'DOC'             {$$ = yytext;}
    | 'COLLECTION'      {$$ = yytext;}
    | 'COLGROUP'        {$$ = yytext;}
    ;

boolExpr
    : compExpr boolOp boolExpr {$$ = {type: 'boolExpr', left: $1, op: $2, right: $3};}
    | compExpr { $$ = $1; }
    ;

orderLimit
    : 'ORDER' 'BY' orderExpr 'LIMIT' INT {$$ = {type: 'orderLimit', order: $3, limit: parseInt($5, 10)};}
    | 'ORDER' 'BY' orderExpr {$$ = {type: 'orderLimit', order: $3, limit: null};}
    | 'LIMIT' INT {$$ = {type: 'orderLimit', order: [], limit: parseInt($2, 10)};}
    ;

orderExpr
    : orderItem ',' orderExpr {$$ = [$1].concat($3);}
    | orderItem {$$ = [$1];}
    ;

orderItem
    : IDENTIFIER orderType {$$ = {type: 'orderItem', v: $1, type: $2};}
    | IDENTIFIER {$$ = {type: 'orderItem', v: $1, type: 'ASC'};}
    ;

orderType
    : 'ASC'                {$$ = yytext;}
    | 'DESC'               {$$ = yytext;}
    ;

compExpr
    : name compOp literal {$$ = {type: 'compExpr', left: $1, op: $2, right: $3};}
    | name arrayOp array  {$$ = {type: 'compExpr', left: $1, op: $2, right: $3};}
    ;

compOp
    : '<'                   {$$ = {type: 'compOp', v: yytext};}
    | '<='                  {$$ = {type: 'compOp', v: yytext};}
    | '=='                  {$$ = {type: 'compOp', v: yytext};}
    | '>='                  {$$ = {type: 'compOp', v: yytext};}
    | '>'                   {$$ = {type: 'compOp', v: yytext};}
    | '!='                  {$$ = {type: 'compOp', v: yytext};}
    ;

arrayOp
    : 'array-contains'      {$$ = {type: 'compOp', v: yytext};}
    | 'array-contains-any'  {$$ = {type: 'compOp', v: yytext};}
    | 'in'                  {$$ = {type: 'compOp', v: yytext};}
    | 'not-in'              {$$ = {type: 'compOp', v: yytext};}
    ;

boolOp
    : 'and'                   {$$ = {type: 'boolOp', v: yytext};}
    ;

array
    : '[' arrayItems ']'      {$$ = {type: 'array', v: $2};}
    | '[' ']'                 {$$ = {type: 'array', v: []};}
    ;

arrayItems
    : literal ',' arrayItems {$$ = [$1].concat($3);}
    | literal {$$ = [$1];}
    ;

literal
    : FLOAT                 {$$ = {type: 'float', v: parseFloat(yytext)};}
    | INT                   {$$ = {type: 'int', v: parseInt(yytext, 10)};}
    | STRING                {$$ = {type: 'str', v: JSON.parse(yytext)};}
    | BOOL                  {$$ = {type: 'bool', v: yytext === 'true'};}
    | VAR                   {$$ = {type: 'var', v: yytext.slice(2, -1)};}
    ;

name
    : IDENTIFIER            {$$ = {type: 'name', v: yytext};}
    ;
