import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Super admins hardcoded
const SUPER_ADMINS = ['ueservicesllc1@gmail.com', 'leyanis@prontoenvios.us'];

export const useUserRole = (user) => {
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRole = async () => {
            if (!user || !user.email) {
                setRole(null);
                setLoading(false);
                return;
            }

            // Check if user is a super admin
            if (SUPER_ADMINS.includes(user.email)) {
                setRole('super_admin');
                setLoading(false);
                return;
            }

            try {
                // Check Firestore for user role
                const userDoc = await getDoc(doc(db, 'users', user.email));

                if (userDoc.exists()) {
                    setRole(userDoc.data().role || 'editor');
                } else {
                    // Default to editor if not found
                    setRole('editor');
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
                setRole('editor'); // Default to editor on error
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, [user]);

    return {
        role,
        loading,
        isAdmin: role === 'admin' || role === 'super_admin',
        isSuperAdmin: role === 'super_admin',
        isEditor: role === 'editor'
    };
};
