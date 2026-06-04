import { useEffect, useState } from 'react';
import PrivacyModal from '@/components/PrivacyModal';

const CONSENT_KEY = 'privacy_consent_accepted';

/**
 * Shows the Privacy Policy + Risk Disclaimer as a blocking consent gate on the
 * user's first visit. Once accepted, the choice is stored in localStorage and
 * the gate never shows again.
 */
const ConsentGate = () => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (localStorage.getItem(CONSENT_KEY) !== 'true') {
            setOpen(true);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem(CONSENT_KEY, 'true');
        setOpen(false);
    };

    return <PrivacyModal open={open} requireAccept onClose={() => {}} onAccept={handleAccept} />;
};

export default ConsentGate;
