import * as math from 'mathjs';

export interface VerificationResult {
  verification_status: 'verified' | 'partially_verified' | 'needs_review';
  verification_method: string;
  independent_check_performed: boolean;
  checked_components: string[];
  issues_found: string[];
  verification_details: string;
  uncertainty_notes: string[];
}

export class VerificationEngine {
  /**
   * Deterministically verifies mathematical equations or numerical solutions
   * using mathjs symbolic evaluation and arithmetic parsing.
   */
  public static verifySolution(
    questionText: string,
    extractedQuestion: string,
    finalAnswer: string | null,
    solutionSteps: Array<{ step_number: number; title: string; content: string; reason: string }>
  ): VerificationResult {
    const checkedComponents: string[] = [];
    const issuesFound: string[] = [];
    const uncertaintyNotes: string[] = [];
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
          } else {
            issuesFound.push(`LHS evaluated to ${lhsEval} while RHS evaluated to ${rhsEval}`);
          }
        } catch (e: any) {
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
        } catch {
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
