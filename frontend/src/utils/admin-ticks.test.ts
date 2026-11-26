import { describe, expect, it } from 'vitest';
import {
    digitWins,
    directionExit,
    isDigitContract,
    isDirectionContract,
    pickRoundDigit,
    withLastDigit,
} from './admin-ticks';

/** The combo the Nexora free bot actually trades. */
const OVER2_UNDER7 = [
    { contract_type: 'DIGITOVER', barrier: 2 },
    { contract_type: 'DIGITUNDER', barrier: 7 },
];

const RUNS = 300;

describe('digitWins', () => {
    it('settles each digit contract the way Deriv does', () => {
        expect(digitWins('DIGITEVEN', undefined, 4)).toBe(true);
        expect(digitWins('DIGITEVEN', undefined, 5)).toBe(false);
        expect(digitWins('DIGITODD', undefined, 7)).toBe(true);
        // Over and Under are strict: the barrier itself loses both.
        expect(digitWins('DIGITOVER', 2, 3)).toBe(true);
        expect(digitWins('DIGITOVER', 2, 2)).toBe(false);
        expect(digitWins('DIGITUNDER', 7, 6)).toBe(true);
        expect(digitWins('DIGITUNDER', 7, 7)).toBe(false);
        expect(digitWins('DIGITMATCH', 5, 5)).toBe(true);
        expect(digitWins('DIGITDIFF', 5, 5)).toBe(false);
    });

    it('calls a contract it cannot settle a loss rather than guessing', () => {
        expect(digitWins('TICKHIGH', 5, 9)).toBe(false);
    });
});

describe('pickRoundDigit', () => {
    it('gives a winning round a digit every leg wins on', () => {
        for (let i = 0; i < RUNS; i += 1) {
            const d = pickRoundDigit(OVER2_UNDER7, true);
            expect(d).toBeGreaterThanOrEqual(3);
            expect(d).toBeLessThanOrEqual(6);
        }
    });

    it('gives a losing round a digit at least one leg loses on', () => {
        for (let i = 0; i < RUNS; i += 1) {
            const d = pickRoundDigit(OVER2_UNDER7, false);
            expect([0, 1, 2, 7, 8, 9]).toContain(d);
        }
    });

    /* The bug this whole file exists for: each leg used to draw its own
       verdict, so a round could report both legs losing. One tick cannot do
       that — Over 2 loses on 0-2 and Under 7 on 7-9, and the two never meet. */
    it('never produces a round where both legs lose', () => {
        for (const win of [true, false]) {
            for (let i = 0; i < RUNS; i += 1) {
                const d = pickRoundDigit(OVER2_UNDER7, win);
                const results = OVER2_UNDER7.map(l => digitWins(l.contract_type, l.barrier, d));
                expect(results.some(Boolean)).toBe(true);
            }
        }
    });

    it('matches a single leg to its own verdict', () => {
        for (let i = 0; i < RUNS; i += 1) {
            expect(pickRoundDigit([{ contract_type: 'DIGITEVEN' }], true) % 2).toBe(0);
            expect(pickRoundDigit([{ contract_type: 'DIGITODD' }], true) % 2).toBe(1);
            expect(pickRoundDigit([{ contract_type: 'DIGITEVEN' }], false) % 2).toBe(1);
        }
    });

    /* Matches 5 and Differs 5 cannot both win on one digit. The tick still has
       to exist, so it is built anyway and the legs report what it did — which
       is the behaviour that keeps the row honest. */
    it('still returns a digit when the legs cannot all win', () => {
        for (let i = 0; i < RUNS; i += 1) {
            const legs = [
                { contract_type: 'DIGITMATCH', barrier: 5 },
                { contract_type: 'DIGITDIFF', barrier: 5 },
            ];
            const d = pickRoundDigit(legs, true);
            expect(d).toBeGreaterThanOrEqual(0);
            expect(d).toBeLessThanOrEqual(9);
            const results = legs.map(l => digitWins(l.contract_type, l.barrier, d));
            // Exactly one of the pair wins, whatever digit comes out.
            expect(results.filter(Boolean)).toHaveLength(1);
        }
    });
});

describe('withLastDigit', () => {
    it('replaces the last digit and leaves the price level alone', () => {
        expect(withLastDigit(1234.56, 2, 8)).toBe('1234.58');
        expect(withLastDigit(903.261, 3, 0)).toBe('903.260');
        // A whole-number quote: the units digit is the last digit.
        expect(withLastDigit(7382, 0, 5)).toBe('7385');
    });

    it('keeps the symbol decimals, since the digit is the last of them', () => {
        // 1234.5 at 2 decimals is 1234.50, whose last digit is the one that
        // settles the contract — dropping the trailing zero reads digit 5.
        expect(withLastDigit(1234.5, 2, 3)).toBe('1234.53');
    });
});

describe('directionExit', () => {
    const entry = 1000;

    it('closes above the entry for a winning Rise and a losing Fall', () => {
        for (let i = 0; i < RUNS; i += 1) {
            expect(Number(directionExit(entry, 'CALL', true, 2))).toBeGreaterThan(entry);
            expect(Number(directionExit(entry, 'PUT', false, 2))).toBeGreaterThan(entry);
        }
    });

    it('closes below the entry for a losing Rise and a winning Fall', () => {
        for (let i = 0; i < RUNS; i += 1) {
            expect(Number(directionExit(entry, 'CALL', false, 2))).toBeLessThan(entry);
            expect(Number(directionExit(entry, 'PUT', true, 2))).toBeLessThan(entry);
        }
    });

    it('moves by whole pips of the symbol, never a fraction of one', () => {
        for (let i = 0; i < RUNS; i += 1) {
            const pips = Math.round((Number(directionExit(entry, 'CALL', true, 3)) - entry) * 1000);
            expect(pips).toBeGreaterThanOrEqual(1);
            expect(pips).toBeLessThanOrEqual(5);
        }
    });
});

describe('contract classification', () => {
    it('separates the two ways a contract can settle', () => {
        expect(isDigitContract('DIGITOVER')).toBe(true);
        expect(isDigitContract('CALL')).toBe(false);
        expect(isDirectionContract('CALL')).toBe(true);
        expect(isDirectionContract('PUTE')).toBe(true);
        expect(isDirectionContract('DIGITEVEN')).toBe(false);
        // Neither: it keeps the round's verdict and an unforced spot.
        expect(isDigitContract('TICKHIGH')).toBe(false);
        expect(isDirectionContract('TICKHIGH')).toBe(false);
    });
});
