/**
 * The tick a simulated round settles on.
 *
 * A simulated contract never reaches Deriv, so nothing outside this app decides
 * what it settled at — and a row reporting "Over 2, won" beside an exit spot
 * ending in 1 is reporting two different trades. The verdict is decided first;
 * these build the tick that produces it, the way the bots' admin store does.
 */

/** Contracts settled by a last digit. */
export const isDigitContract = (contractType: string): boolean => contractType.startsWith('DIGIT');

/** Contracts settled by where the exit sits against the entry. */
const DIRECTION: Record<string, boolean> = {
    CALL: true,
    CALLE: true,
    HIGHER: true,
    PUT: false,
    PUTE: false,
    LOWER: false,
};

export const isDirectionContract = (contractType: string): boolean => contractType in DIRECTION;

export interface DigitLeg {
    contract_type: string;
    barrier?: number;
}

/** Whether `digit` wins this contract — the table Deriv settles on. */
export const digitWins = (contractType: string, barrier: number | undefined, digit: number): boolean => {
    const b = barrier ?? 0;
    switch (contractType) {
        case 'DIGITEVEN':
            return digit % 2 === 0;
        case 'DIGITODD':
            return digit % 2 === 1;
        case 'DIGITOVER':
            return digit > b;
        case 'DIGITUNDER':
            return digit < b;
        case 'DIGITMATCH':
            return digit === b;
        case 'DIGITDIFF':
            return digit !== b;
        default:
            return false;
    }
};

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * A last digit that makes the round come out the way `win` says.
 *
 * Every leg of a combo is bought on one tick, so one digit has to explain all
 * of them, and the round wins only when every leg does. Deciding a leg at a
 * time is how Over 2 + Under 7 could report both legs losing — which no digit
 * can produce, since Over 2 loses on 0-2 and Under 7 on 7-9.
 *
 * The two sets partition the ten digits, so one of them always has members.
 * Where the asked-for one is empty — legs that cannot all win, such as Matches
 * and Differs on one barrier — the other is used and the legs follow the digit.
 * The round then reports what the tick did rather than what was asked for,
 * which is the point of settling them together.
 */
export const pickRoundDigit = (legs: DigitLeg[], win: boolean): number => {
    const allWin = (d: number) => legs.every(l => digitWins(l.contract_type, l.barrier, d));
    const wanted = DIGITS.filter(d => allWin(d) === win);
    const pool = wanted.length ? wanted : DIGITS.filter(d => allWin(d) !== win);
    return pool[Math.floor(Math.random() * pool.length)];
};

/**
 * `quote` requoted so its last digit is `digit`.
 *
 * Only the last digit moves, so the price stays at the level the market is
 * actually trading at and the fiction is one digit wide.
 */
export const withLastDigit = (quote: number, decimals: number, digit: number): string => {
    const body = Math.abs(quote).toFixed(decimals);
    return `${quote < 0 ? '-' : ''}${body.slice(0, -1)}${digit}`;
};

/**
 * An exit the given direction contract produces this result from.
 *
 * Rise and Fall are settled by where the exit sits against the entry, so the
 * whole quote has to move and the way it moves IS the result — a forced last
 * digit would say nothing at all. One to five pips, so a run of rounds does
 * not move by the same amount every time.
 */
export const directionExit = (entry: number, contractType: string, win: boolean, decimals: number): string => {
    const up = DIRECTION[contractType] ?? true;
    const rises = win ? up : !up;
    const pip = Math.pow(10, -decimals);
    const move = pip * (1 + Math.floor(Math.random() * 5));
    return (entry + (rises ? move : -move)).toFixed(decimals);
};
