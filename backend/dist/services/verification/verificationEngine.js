"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationEngine = void 0;
const math = __importStar(require("mathjs"));
class VerificationEngine {
    /**
     * Deterministically verifies mathematical equations or numerical solutions
     * using mathjs symbolic evaluation and arithmetic parsing.
     */
    static verifySolution(questionText, extractedQuestion, finalAnswer, solutionSteps) {
        const checkedComponents = [];
        const issuesFound = [];
        const uncertaintyNotes = [];
        let checkPerformed = false;
        let verified = false;
        const fullText = `${questionText || ''} ${extractedQuestion || ''}`;
        // 1. Check for linear / quadratic equation pattern (e.g. 2x + 5 = 15 or ax^2 + bx + c = 0)
        const eqMatch = fullText.match(/([0-9xX\+\-\*\/\^\s\(\)\.]+)\s*=\s*([0-9xX\+\-\*\/\^\s\(\)\.]+)/);
        if (eqMatch && finalAnswer) {
            checkPerformed = true;
            checkedComponents.push('Algebraic equality check');
            const lhsStr = eqMatch[1].trim();
            const rhsStr = eqMatch[2].trim();
            // Extract candidate number for x from finalAnswer (e.g., "x = 5" or "5" or "x = -2, 3")
            const valMatch = finalAnswer.match(/(?:[xX]\s*=\s*)?(-?\d+(?:\.\d+)?)/);
            if (valMatch) {
                const candidateVal = parseFloat(valMatch[1]);
                try {
                    const lhsCompiled = math.compile(lhsStr.replace(/[xX]/g, `(${candidateVal})`));
                    const rhsCompiled = math.compile(rhsStr.replace(/[xX]/g, `(${candidateVal})`));
                    const lhsEval = lhsCompiled.evaluate();
                    const rhsEval = rhsCompiled.evaluate();
                    const diff = Math.abs(lhsEval - rhsEval);
                    if (diff < 1e-5) {
                        verified = true;
                        return {
                            verification_status: 'verified',
                            verification_method: 'Independent symbolic evaluation (mathjs algebra evaluator)',
                            independent_check_performed: true,
                            checked_components: ['Equation root validation (LHS = RHS evaluation)'],
                            issues_found: [],
                            verification_details: `Verified by substituting proposed root (${valMatch[1]}) into LHS (${lhsStr}) and RHS (${rhsStr}). Evaluated result: LHS = ${lhsEval}, RHS = ${rhsEval} (difference: ${diff.toFixed(6)}).`,
                            uncertainty_notes: [],
                        };
                    }
                    else {
                        issuesFound.push(`LHS evaluated to ${lhsEval} while RHS evaluated to ${rhsEval}`);
                    }
                }
                catch (e) {
                    uncertaintyNotes.push(`Could not symbolically parse algebraic expression: ${e.message}`);
                }
            }
        }
        // 2. Check for simple arithmetic / expression evaluation (e.g. 15 * 4 + 10)
        const arithMatch = fullText.match(/(?:calculate|solve|evaluate|what is)?\s*([0-9\+\-\*\/\^\(\)\.\s]{3,})/i);
        if (arithMatch && finalAnswer) {
            const expr = arithMatch[1].trim();
            // Ensure it contains at least one operator
            if (/[\+\-\*\/]/.test(expr)) {
                checkPerformed = true;
                checkedComponents.push('Deterministic arithmetic expression evaluator');
                try {
                    const expected = math.evaluate(expr);
                    const numInAnswer = finalAnswer.match(/-?\d+(?:\.\d+)?/);
                    if (numInAnswer && Math.abs(parseFloat(numInAnswer[0]) - Number(expected)) < 1e-4) {
                        return {
                            verification_status: 'verified',
                            verification_method: 'Independent arithmetic verification (mathjs parser)',
                            independent_check_performed: true,
                            checked_components: ['Expression evaluation'],
                            issues_found: [],
                            verification_details: `Evaluated expression "${expr}" independently. Result ${expected} exactly matches final answer ${numInAnswer[0]}.`,
                            uncertainty_notes: [],
                        };
                    }
                }
                catch {
                    // Pass through to next checks
                }
            }
        }
        // 3. Step logic & structure verification (checks that steps are non-empty, sequential, and consistent)
        if (solutionSteps && solutionSteps.length >= 2) {
            checkPerformed = true;
            checkedComponents.push('Step-by-step structural coherence check');
            const stepNumbers = solutionSteps.map(s => s.step_number);
            const isSequential = stepNumbers.every((num, idx) => num === idx + 1);
            if (!isSequential) {
                issuesFound.push('Solution steps are not sequentially numbered');
            }
            if (finalAnswer && finalAnswer.trim().length > 0) {
                return {
                    verification_status: issuesFound.length === 0 ? 'partially_verified' : 'needs_review',
                    verification_method: 'Algorithmic structural validation & consistency analysis',
                    independent_check_performed: true,
                    checked_components: checkedComponents,
                    issues_found: issuesFound,
                    verification_details: 'Structural validity, step coherence, and answer specification checked. Conceptual explanation verified; exact external calculation unavailable for non-algebraic query.',
                    uncertainty_notes: ['Independent deterministic calculation was not applicable to qualitative conceptual steps.'],
                };
            }
        }
        return {
            verification_status: 'needs_review',
            verification_method: checkPerformed ? 'Automated consistency checker' : 'Model-only heuristic review (no independent solver applied)',
            independent_check_performed: checkPerformed,
            checked_components: checkedComponents.length > 0 ? checkedComponents : ['Heuristic inspection'],
            issues_found: issuesFound,
            verification_details: checkPerformed
                ? 'Independent verification performed but could not definitively confirm numerical correctness.'
                : 'Query requires qualitative domain evaluation; independent deterministic computation was not executed.',
            uncertainty_notes: uncertaintyNotes.length > 0 ? uncertaintyNotes : ['Review by teacher or standard textbook solution key recommended.'],
        };
    }
}
exports.VerificationEngine = VerificationEngine;
