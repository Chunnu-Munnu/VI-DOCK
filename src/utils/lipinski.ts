export interface LipinskiReport {
    molecularWeight: number;
    logP: number;
    hBondDonors: number;
    hBondAcceptors: number;
    violations: number;
    pass: boolean;
    details: {
        mwPass: boolean;
        logPPass: boolean;
        hbdPass: boolean;
        hbaPass: boolean;
    };
}

/**
 * Validates a molecule against Lipinski's Rule of 5 parameters.
 * Rule:
 * - Molecular weight <= 500 Da
 * - LogP <= 5
 * - H-bond donors <= 5
 * - H-bond acceptors <= 10
 * 
 * A molecule fails if it has more than 1 violation.
 */
export function checkLipinski(mw: number, logP: number, hbd: number, hba: number): LipinskiReport {
    const mwPass = mw <= 500;
    const logPPass = logP <= 5;
    const hbdPass = hbd <= 5;
    const hbaPass = hba <= 10;

    let violations = 0;
    if (!mwPass) violations++;
    if (!logPPass) violations++;
    if (!hbdPass) violations++;
    if (!hbaPass) violations++;

    return {
        molecularWeight: mw,
        logP: logP,
        hBondDonors: hbd,
        hBondAcceptors: hba,
        violations: violations,
        pass: violations <= 1, // Rule states normally no more than 1 violation is acceptable
        details: {
            mwPass,
            logPPass,
            hbdPass,
            hbaPass
        }
    };
}
