/* description: Parses and firebase query expressions. */

/* lexical grammar */
%lex
%%

\s+                   /* skip whitespace */
[0-9]+("."[0-9]+)?\b  return 'NUMBER';
(true|false)          return 'BOOL';
and                   return 'and';
'"'("\\"["]|[^"])*'"' return 'STRING';

"<="                  return '<=';
"<"                   return '<';
"=="                  return '==';
">="                  return '>=';
">"                   return '>';
"!="                  return '!=';
"array-contains"      return 'array-contains';
"array-contains-any"  return 'array-contains-any';
"in"                  return 'in';
"not-in"              return 'not-in';

[a-zA-Z]{1,}[a-zA-Z0-9_]* return 'IDENTIFIER';
<<EOF>>               return 'EOF';
.                     return 'INVALID';

/lex

%start expressions

%% /* language grammar */

expressions : boolExpr EOF { return $1; };

boolExpr
    : compExpr boolOp boolExpr {$$ = {type: 'boolExpr', left: $1, op: $2, right: $3};}
    | compExpr { $$ = $1; }
    ;

compExpr
    : name compOp literal {$$ = {type: 'compExpr', left: $1, op: $2, right: $3};}
    ;

compOp
    : '<'                   {$$ = {type: 'compOp', v: yytext};}
    | '<='                  {$$ = {type: 'compOp', v: yytext};}
    | '=='                  {$$ = {type: 'compOp', v: yytext};}
    | '>='                  {$$ = {type: 'compOp', v: yytext};}
    | '>'                   {$$ = {type: 'compOp', v: yytext};}
    | '!='                  {$$ = {type: 'compOp', v: yytext};}
    | 'array-contains'      {$$ = {type: 'compOp', v: yytext};}
    | 'array-contains-any'  {$$ = {type: 'compOp', v: yytext};}
    | 'in'                  {$$ = {type: 'compOp', v: yytext};}
    | 'not-in'              {$$ = {type: 'compOp', v: yytext};}
    ;

boolOp
    : 'and'                   {$$ = {type: 'boolOp', v: yytext};}
    ;

literal
    : NUMBER                {$$ = {type: 'num', v: parseFloat(yytext)};}
    | STRING                {$$ = {type: 'str', v: yytext.slice(1, -1)};}
    | BOOL                  {$$ = {type: 'bool', v: yytext === 'true'};}
    ;

name
    : IDENTIFIER            {$$ = {type: 'name', v: yytext};}
    ;
