import { useEffect, useState } from 'react';
import { getSettings } from '@/services/trade-api';
import { useAuth } from '@/context/AuthContext';

/**
 * The signed-in user's first name, for the greeting bubble.
 *
 * Null until it arrives, and null for good if Deriv has no name on the
 * account — the bubble greets them without one rather than showing a
 * placeholder where a person's name should be.
 */
export const useAccountName = (): string | null => {
    const { isAuthenticated, activeLoginId } = useAuth();
    const [name, setName] = useState<string | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            setName(null);
            return;
        }

        let active = true;
        getSettings()
            .then(s => {
                if (!active) return;
                const first = (s.first_name ?? '').trim();
                setName(first || null);
            })
            .catch(() => {
                /* The greeting works without it. */
            });

        return () => {
            active = false;
        };
    }, [isAuthenticated, activeLoginId]);

    return name;
};

export default useAccountName;
