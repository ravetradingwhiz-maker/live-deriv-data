import { tradeWS } from '@/services/trade-ws';
import type { TTransport } from './types';

/** Transport for the SmartCharts adapter, backed by our shared tradeWS. */
export function createTransport(): TTransport {
    const subs = new Map<string, () => void>();
    let counter = 0;

    return {
        send(request: any) {
            return tradeWS.send(request);
        },
        subscribe(request: any, callback: (response: any) => void): string {
            const id = `sub-${++counter}`;
            tradeWS
                .subscribe(request, callback)
                .then(s => {
                    if (subs.has(id)) subs.set(id, s.forget);
                    else s.forget(); // unsubscribed before it resolved
                })
                .catch(() => {});
            subs.set(id, () => {});
            return id;
        },
        unsubscribe(id: string) {
            subs.get(id)?.();
            subs.delete(id);
        },
        unsubscribeAll() {
            subs.forEach(forget => forget());
            subs.clear();
        },
    };
}
