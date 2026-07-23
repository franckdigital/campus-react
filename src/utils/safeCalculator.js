/**
 * Minimal recursive-descent arithmetic parser/evaluator — deliberately NOT
 * eval()/Function() (student-typed input must never reach either). Supports
 * + - * / ^ %, parentheses, unary minus, decimals, and sqrt(...).
 * Grammar: expr := term (('+'|'-') term)*
 *          term := power (('*'|'/') power)*
 *          power := unary ('^' unary)*
 *          unary := '-' unary | primary
 *          primary := number | 'sqrt(' expr ')' | '(' expr ')'
 */
export function evaluateExpression(input) {
  const src = String(input).replace(/×/g, '*').replace(/÷/g, '/').replace(/,/g, '.');
  let pos = 0;

  const peek = () => src[pos];
  const skipSpace = () => { while (src[pos] === ' ') pos++; };

  function parseExpr() {
    let value = parseTerm();
    for (;;) {
      skipSpace();
      const op = peek();
      if (op === '+' || op === '-') {
        pos++;
        const rhs = parseTerm();
        value = op === '+' ? value + rhs : value - rhs;
      } else break;
    }
    return value;
  }

  function parseTerm() {
    let value = parsePower();
    for (;;) {
      skipSpace();
      const op = peek();
      if (op === '*' || op === '/' || op === '%') {
        pos++;
        const rhs = parsePower();
        if (op === '*') value *= rhs;
        else if (op === '/') {
          if (rhs === 0) throw new Error('Division par zéro');
          value /= rhs;
        } else value %= rhs;
      } else break;
    }
    return value;
  }

  function parsePower() {
    let value = parseUnary();
    skipSpace();
    if (peek() === '^') {
      pos++;
      const exp = parsePower(); // right-associative
      value = Math.pow(value, exp);
    }
    return value;
  }

  function parseUnary() {
    skipSpace();
    if (peek() === '-') { pos++; return -parseUnary(); }
    if (peek() === '+') { pos++; return parseUnary(); }
    return parsePrimary();
  }

  function parsePrimary() {
    skipSpace();
    if (src.startsWith('sqrt', pos)) {
      pos += 4;
      skipSpace();
      if (peek() !== '(') throw new Error('Syntaxe invalide après sqrt');
      pos++;
      const inner = parseExpr();
      skipSpace();
      if (peek() !== ')') throw new Error('Parenthèse manquante');
      pos++;
      if (inner < 0) throw new Error('Racine négative');
      return Math.sqrt(inner);
    }
    if (peek() === '(') {
      pos++;
      const value = parseExpr();
      skipSpace();
      if (peek() !== ')') throw new Error('Parenthèse manquante');
      pos++;
      return value;
    }
    const match = /^\d+(\.\d+)?/.exec(src.slice(pos));
    if (!match) throw new Error('Expression invalide');
    pos += match[0].length;
    return parseFloat(match[0]);
  }

  if (!src.trim()) throw new Error('Expression vide');
  const result = parseExpr();
  skipSpace();
  if (pos < src.length) throw new Error('Caractère inattendu: ' + src[pos]);
  if (!Number.isFinite(result)) throw new Error('Résultat invalide');
  return result;
}
