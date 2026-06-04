/**
 * Contract-type catalog for the manual trading panel. Each entry is a two-button
 * contract family (up/down) with the inputs it needs. Proposal/buy use the
 * `code` per side; the icon maps to a TradeTypeIcon.
 */
export type BarrierKind = 'none' | 'digit' | 'offset';

export interface ContractSide {
    code: string; // proposal contract_type
    label: string; // button label
    icon: string; // TradeTypeIcon type
    dir: 'up' | 'down';
}

export interface ContractType {
    id: string;
    category: string;
    name: string;
    up: ContractSide;
    down: ContractSide;
    barrier: BarrierKind;
    durationUnits: string[]; // allowed duration units
    defaultDuration: number;
    defaultUnit: string;
}

export const CONTRACT_TYPES: ContractType[] = [
    {
        id: 'rise_fall',
        category: 'Up/Down',
        name: 'Rise/Fall',
        up: { code: 'CALL', label: 'Rise', icon: 'CALL', dir: 'up' },
        down: { code: 'PUT', label: 'Fall', icon: 'PUT', dir: 'down' },
        barrier: 'none',
        durationUnits: ['t', 's', 'm', 'h'],
        defaultDuration: 5,
        defaultUnit: 't',
    },
    {
        id: 'rise_fall_equals',
        category: 'Up/Down',
        name: 'Rise/Fall Equals',
        up: { code: 'CALLE', label: 'Rise', icon: 'CALLE', dir: 'up' },
        down: { code: 'PUTE', label: 'Fall', icon: 'PUTE', dir: 'down' },
        barrier: 'none',
        durationUnits: ['t', 's', 'm', 'h'],
        defaultDuration: 5,
        defaultUnit: 't',
    },
    {
        id: 'higher_lower',
        category: 'Up/Down',
        name: 'Higher/Lower',
        up: { code: 'CALL', label: 'Higher', icon: 'HIGHER', dir: 'up' },
        down: { code: 'PUT', label: 'Lower', icon: 'LOWER', dir: 'down' },
        barrier: 'offset',
        durationUnits: ['t', 's', 'm', 'h', 'd'],
        defaultDuration: 5,
        defaultUnit: 'm',
    },
    {
        id: 'touch',
        category: 'Touch/No Touch',
        name: 'Touch/No Touch',
        up: { code: 'ONETOUCH', label: 'Touch', icon: 'ONETOUCH', dir: 'up' },
        down: { code: 'NOTOUCH', label: 'No Touch', icon: 'NOTOUCH', dir: 'down' },
        barrier: 'offset',
        durationUnits: ['t', 's', 'm', 'h', 'd'],
        defaultDuration: 5,
        defaultUnit: 'm',
    },
    {
        id: 'matches_differs',
        category: 'Digits',
        name: 'Matches/Differs',
        up: { code: 'DIGITMATCH', label: 'Matches', icon: 'DIGITMATCH', dir: 'up' },
        down: { code: 'DIGITDIFF', label: 'Differs', icon: 'DIGITDIFF', dir: 'down' },
        barrier: 'digit',
        durationUnits: ['t'],
        defaultDuration: 1,
        defaultUnit: 't',
    },
    {
        id: 'even_odd',
        category: 'Digits',
        name: 'Even/Odd',
        up: { code: 'DIGITEVEN', label: 'Even', icon: 'DIGITEVEN', dir: 'up' },
        down: { code: 'DIGITODD', label: 'Odd', icon: 'DIGITODD', dir: 'down' },
        barrier: 'none',
        durationUnits: ['t'],
        defaultDuration: 1,
        defaultUnit: 't',
    },
    {
        id: 'over_under',
        category: 'Digits',
        name: 'Over/Under',
        up: { code: 'DIGITOVER', label: 'Over', icon: 'DIGITOVER', dir: 'up' },
        down: { code: 'DIGITUNDER', label: 'Under', icon: 'DIGITUNDER', dir: 'down' },
        barrier: 'digit',
        durationUnits: ['t'],
        defaultDuration: 1,
        defaultUnit: 't',
    },
];

export const getContractType = (id: string): ContractType =>
    CONTRACT_TYPES.find(c => c.id === id) ?? CONTRACT_TYPES[0];

export const DURATION_UNIT_LABELS: Record<string, string> = {
    t: 'Ticks',
    s: 'Seconds',
    m: 'Minutes',
    h: 'Hours',
    d: 'Days',
};
