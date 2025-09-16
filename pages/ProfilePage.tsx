import React, { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';

const ProfilePage: React.FC = () => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserProfile = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                try {
                    const userSnapshot = await db.ref('users/' + currentUser.uid).get();
                    if (userSnapshot.exists()) {
                        setUserProfile(userSnapshot.val() as UserProfile);
                    } else {
                        setError("User profile not found.");
                    }
                } catch (err: any) {
                    setError("Failed to fetch profile: " + err.message);
                }
            }
            setLoading(false);
        };

        fetchUserProfile();
    }, []);

    const ProfileField: React.FC<{ label: string; value: string | undefined }> = ({ label, value }) => (
        <div>
            <label className="text-sm font-medium text-gray-400">{label}</label>
            <p className="mt-1 text-lg bg-gray-700 p-3 rounded-lg">{value || 'N/A'}</p>
        </div>
    );

    if (loading) {
        return <p className="text-gray-400">Loading profile...</p>;
    }

    if (error) {
        return <p className="text-red-400">{error}</p>;
    }

    return (
        <div>
            <h1 className="text-4xl font-bold text-white mb-8">My Profile</h1>
            {userProfile ? (
                <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-8 max-w-2xl mx-auto">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <ProfileField label="First Name" value={userProfile.firstName} />
                            <ProfileField label="Last Name" value={userProfile.lastName} />
                        </div>
                        <ProfileField label="Email Address" value={userProfile.email} />
                        <ProfileField label="Phone Number" value={userProfile.phone} />
                    </div>
                </div>
            ) : (
                <p>No profile data available.</p>
            )}
        </div>
    );
};

export default ProfilePage;
