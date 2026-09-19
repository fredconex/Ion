// calculator - tool definition.
const TOOL_META = {
    "name": "calculator",
    "description": "Evaluate mathematical equations and formulas safely. Supports arithmetic operations (+, -, *, /, %, ^), standard constants (pi, e), and common functions (sqrt, abs, sin, cos, tan, log, min, max, pow, etc.).",
    "parameters": {
        "type": "object",
        "properties": {
            "expression": {
                "type": "string",
                "description": "The mathematical formula to evaluate, e.g., '2 * (3 + 4)', 'sqrt(144) + 2^3', or 'sin(pi / 2)'."
            }
        },
        "required": [
            "expression"
        ]
    },
    "modes": [
        "code",
        "ask",
        "plan"
    ],
    "permission": "auto",
    "toolBox": 1
};

async function handler(args, api) {
    if (!args.expression || typeof args.expression !== 'string') {
        return "ERROR: An 'expression' string must be provided.";
    }

    // Helper parser contained inside the handler
    function evaluateMath(expr) {
        let pos = 0;
        expr = expr.trim();

        function peek() {
            while (pos < expr.length && /\s/.test(expr[pos])) pos++;
            return expr[pos] || '';
        }

        function match(char) {
            if (peek() === char) {
                pos++;
                return true;
            }
            return false;
        }

        function parseExpression() {
            let left = parseTerm();
            while (true) {
                if (match('+')) left += parseTerm();
                else if (match('-')) left -= parseTerm();
                else break;
            }
            return left;
        }

        function parseTerm() {
            let left = parsePower();
            while (true) {
                if (match('*')) {
                    left *= parsePower();
                } else if (match('/')) {
                    const divisor = parsePower();
                    if (divisor === 0) throw new Error("Division by zero");
                    left /= divisor;
                } else if (match('%')) {
                    left %= parsePower();
                } else {
                    break;
                }
            }
            return left;
        }

        function parsePower() {
            let base = parseUnary();
            if (match('^')) {
                const exponent = parsePower();
                return Math.pow(base, exponent);
            }
            return base;
        }

        function parseUnary() {
            if (match('+')) return parseUnary();
            if (match('-')) return -parseUnary();
            return parsePrimary();
        }

        function parsePrimary() {
            if (match('(')) {
                const val = parseExpression();
                if (!match(')')) throw new Error("Missing closing parenthesis ')'");
                return val;
            }

            // Numbers (integers, decimals, and scientific notation like 1e-4)
            const numMatch = expr.slice(pos).match(/^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/);
            if (numMatch) {
                pos += numMatch[0].length;
                return parseFloat(numMatch[0]);
            }

            // Identifiers: Constants and Functions
            const idMatch = expr.slice(pos).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
            if (idMatch) {
                const id = idMatch[0].toLowerCase();
                pos += id.length;

                // Mathematical Constants
                if (id === 'pi') return Math.PI;
                if (id === 'e') return Math.E;

                // Functions
                if (match('(')) {
                    const fnArgs = [];
                    if (peek() !== ')') {
                        while (true) {
                            fnArgs.push(parseExpression());
                            if (!match(',')) break;
                        }
                    }
                    if (!match(')')) throw new Error(`Missing ')' after function arguments for '${id}'`);

                    const mathFunctions = {
                        abs: Math.abs, ceil: Math.ceil, floor: Math.floor, round: Math.round,
                        sqrt: Math.sqrt, cbrt: Math.cbrt, exp: Math.exp,
                        log: Math.log, log2: Math.log2, log10: Math.log10,
                        sin: Math.sin, cos: Math.cos, tan: Math.tan,
                        asin: Math.asin, acos: Math.acos, atan: Math.atan, atan2: Math.atan2,
                        min: Math.min, max: Math.max, pow: Math.pow
                    };

                    if (mathFunctions[id]) {
                        return mathFunctions[id](...fnArgs);
                    }
                    throw new Error(`Unknown function '${id}'`);
                }

                throw new Error(`Unknown identifier '${id}'`);
            }

            throw new Error(`Unexpected token '${peek()}' at index ${pos}`);
        }

        const result = parseExpression();
        if (pos < expr.length) {
            throw new Error(`Unexpected character '${expr[pos]}' at index ${pos}`);
        }
        return result;
    }

    try {
        const result = evaluateMath(args.expression);
        if (Number.isNaN(result)) return "Result: NaN";
        return `Result: ${result}`;
    } catch (e) {
        return `ERROR: ${e.message}`;
    }
}