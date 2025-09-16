
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { db } from '../services/firebase';
import { Card } from '../types';
import { calculateDistance } from '../utils/geolocation';
import firebase from 'firebase/compat/app';
import { LocationMarkerIcon } from '../components/icons';

const SubmissionSuccessPage: React.FC = () => {
    const location = useLocation();
    const { id, name, cardId, submissionId, deviceId } = location.state || { id: 'N/A', name: 'N/A', cardId: null, submissionId: null, deviceId: null };

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSignAttendance = async () => {
        if (!cardId || !submissionId) {
            setError("Cannot sign attendance. Required information is missing.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // 1. Fetch card data
            const cardSnapshot = await db.ref(`cards/${cardId}`).get();
            if (!cardSnapshot.exists()) {
                throw new Error("Invalid Card ID. No active session found.");
            }
            const cardData = cardSnapshot.val() as Card;

            if (!cardData.isHosted || !cardData.hostLatitude || !cardData.hostLongitude || !cardData.maxDistance) {
                throw new Error("This card is not currently hosting an attendance session.");
            }

            // 2. Get user's location
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                 navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });
            const { latitude, longitude } = position.coords;
            
            // 3. Calculate distance
            const distance = calculateDistance(cardData.hostLatitude, cardData.hostLongitude, latitude, longitude);
            
            // 4. Determine status
            const status = distance <= cardData.maxDistance ? 'valid' : 'invalid';

            // 5. Create log entry with pre-assigned data
            const logEntry = {
                name: name,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                distance,
                latitude,
                longitude,
                status,
                deviceId: deviceId,
                assignedSubmissionId: submissionId,
                assignedIdentifier: id,
            };

            // 6. Save log
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            await db.ref(`logs/${cardId}/${today}`).push(logEntry);

            // 7. Show success
            setSuccessMessage(`Attendance signed successfully! Your distance was ${distance.toFixed(2)} meters.`);

        } catch (err: any) {
            if (err.code === 1) { // Geolocation permission denied
                 setError("Location permission denied. You must allow location access to sign attendance.");
            } else {
                setError(err.message || "An unknown error occurred.");
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-500/20 mb-6">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-white">Submission Successful!</h1>
                <p className="text-gray-400 mt-2 mb-6">Thank you. Your information has been recorded.</p>
                
                <div className="text-left bg-gray-700/50 rounded-lg p-4 space-y-2 border border-gray-600">
                    <div>
                        <p className="text-sm text-gray-400">Submitted ID:</p>
                        <p className="font-semibold text-white break-words">{id}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Submitted Name:</p>
                        <p className="font-semibold text-white break-words">{name}</p>
                    </div>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">Next Step: Sign Attendance</h2>
                    
                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg mb-4">{error}</p>}
                    {successMessage && <p className="text-green-400 text-sm text-center bg-green-500/10 p-3 rounded-lg mb-4">{successMessage}</p>}

                    <button
                        onClick={handleSignAttendance}
                        disabled={loading || !!successMessage}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        <LocationMarkerIcon />
                        {loading ? 'Processing...' : (successMessage ? 'Attendance Signed' : 'Sign Attendance Now')}
                    </button>
                </div>

                <div className="mt-8">
                    <Link to="/signin" className="text-indigo-400 hover:underline font-semibold">
                       Go to main sign-in page
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SubmissionSuccessPage;
