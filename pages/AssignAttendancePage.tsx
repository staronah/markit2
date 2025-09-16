
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { PublicSubmission } from '../types';

const AssignAttendancePage: React.FC = () => {
    const { cardId, date, logId, name } = useParams<{ cardId: string, date: string, logId: string, name: string }>();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState<PublicSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!cardId) {
            setError("Card ID is missing.");
            setLoading(false);
            return;
        }

        const fetchSubmissions = async () => {
            try {
                const snapshot = await db.ref(`cards/${cardId}/publicusers`).get();
                if (snapshot.exists()) {
                    const subsData = snapshot.val();
                    const subsArray: PublicSubmission[] = Object.keys(subsData)
                        .map(key => ({ id: key, ...subsData[key] }))
                        .sort((a, b) => b.timestamp - a.timestamp);
                    setSubmissions(subsArray);
                } else {
                    setSubmissions([]);
                }
            } catch (err: any) {
                setError("Failed to fetch submissions for this card.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [cardId]);

    const handleAssign = async (submission: PublicSubmission) => {
        if (!cardId || !date || !logId) {
            setError("Cannot perform assignment. Essential data is missing.");
            return;
        }
        setProcessing(true);
        try {
            const logRef = db.ref(`logs/${cardId}/${date}/${logId}`);
            await logRef.update({
                assignedSubmissionId: submission.id,
                assignedIdentifier: submission.identifier,
            });
            setSuccessMessage(`Successfully assigned your attendance to "${submission.identifier}".`);
        } catch (err: any) {
            setError("An error occurred during assignment. Please try again.");
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white"><p>Loading submissions...</p></div>;
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white">Assign Your Attendance</h1>
                    <p className="text-gray-400 mt-2">Welcome, <span className="font-semibold text-indigo-400">{decodeURIComponent(name || '')}</span>! Your attendance was successful.</p>
                </div>

                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-lg mb-4">{error}</p>}
                
                {successMessage ? (
                    <div className="text-center">
                         <p className="text-green-400 text-lg bg-green-500/10 p-4 rounded-lg mb-6">{successMessage}</p>
                         <Link to="/signin" className="text-indigo-400 hover:underline font-semibold">
                            Sign in for another event
                        </Link>
                    </div>
                ) : (
                    <div>
                        {submissions.length > 0 ? (
                            <>
                                <p className="text-gray-300 mb-4 text-center">Please select a submission to link your attendance to:</p>
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {submissions.map(sub => (
                                        <div key={sub.id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-white">{sub.identifier}</p>
                                                <p className="text-sm text-gray-400">{sub.name}</p>
                                            </div>
                                            <button 
                                                onClick={() => handleAssign(sub)}
                                                disabled={processing}
                                                className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-500"
                                            >
                                                {processing ? 'Assigning...' : 'Assign'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-400 text-center py-8">There are no public submissions available to assign to for this card.</p>
                        )}
                        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
                            <button onClick={() => navigate('/signin')} className="text-indigo-400 hover:underline font-semibold">
                                Or, skip this step
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssignAttendancePage;
