
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../services/firebase';
import { Card, AttendanceLog, PublicSubmission } from '../types';
import { ChevronLeftIcon, TrashIcon, LocationMarkerIcon, CalendarIcon } from '../components/icons';

const CardDetailsPage: React.FC = () => {
    const { cardId } = useParams<{ cardId: string }>();
    const navigate = useNavigate();
    const [card, setCard] = useState<Card | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for hosting feature
    const [maxDistanceInput, setMaxDistanceInput] = useState('');
    const [isProcessingHostAction, setIsProcessingHostAction] = useState(false);
    const [hostingError, setHostingError] = useState<string | null>(null);

    // State for logs feature
    const [logs, setLogs] = useState<AttendanceLog[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // State for public submissions
    const [submissions, setSubmissions] = useState<PublicSubmission[]>([]);

    useEffect(() => {
        if (!cardId) {
            setError("No card ID provided.");
            setLoading(false);
            return;
        }
        
        const cardRef = db.ref('cards/' + cardId);

        const listener = cardRef.on('value', snapshot => {
            if (snapshot.exists()) {
                const cardData = snapshot.val();
                const currentUserId = auth.currentUser?.uid;

                if (cardData.userId === currentUserId) {
                    const cardWithSubmissions = { id: snapshot.key!, ...cardData };
                    setCard(cardWithSubmissions as Card);

                    if (cardData.publicusers) {
                        const subsArray: PublicSubmission[] = Object.keys(cardData.publicusers).map(key => ({
                            id: key,
                            ...cardData.publicusers[key]
                        })).sort((a,b) => b.timestamp - a.timestamp);
                        setSubmissions(subsArray);
                    } else {
                        setSubmissions([]);
                    }

                } else {
                    setError("You don't have permission to view this card.");
                }
            } else {
                setError("Card not found.");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching card details: ", error);
            setError("Failed to fetch card details.");
            setLoading(false);
        });

        return () => cardRef.off('value', listener);
    }, [cardId]);

    useEffect(() => {
        if (!cardId || !selectedDate) return;

        const fetchLogs = async () => {
            setLoadingLogs(true);
            const logsRef = db.ref(`logs/${cardId}/${selectedDate}`);
            try {
                const snapshot = await logsRef.get();
                if (snapshot.exists()) {
                    const logsData = snapshot.val();
                    const logsArray: AttendanceLog[] = Object.keys(logsData).map(key => ({
                        id: key,
                        ...logsData[key]
                    }));
                    setLogs(logsArray);
                } else {
                    setLogs([]);
                }
            } catch (err) {
                console.error("Error fetching logs:", err);
                setLogs([]);
            } finally {
                setLoadingLogs(false);
            }
        };
        fetchLogs();
    }, [cardId, selectedDate]);
    
    const handleDelete = async () => {
        if (!cardId) return;

        const userId = auth.currentUser?.uid;
        if (!userId) {
            setError("You must be logged in to delete a card.");
            return;
        }
        
        if (window.confirm("Are you sure you want to delete this card and all its logs? This action cannot be undone.")) {
            try {
                const updates: { [key: string]: null } = {};
                updates[`/cards/${cardId}`] = null;
                updates[`/users/${userId}/cards/${cardId}`] = null;
                updates[`/logs/${cardId}`] = null; // Also delete all logs for the card

                await db.ref().update(updates);
                navigate('/');
            } catch (err: any) {
                setError("Failed to delete card: " + err.message);
            }
        }
    };

    const handleStartHosting = async () => {
        if (!cardId) return;
        const distance = parseInt(maxDistanceInput, 10);
        if (isNaN(distance) || distance <= 0) {
            setHostingError("Please enter a valid distance in meters.");
            return;
        }
        
        setIsProcessingHostAction(true);
        setHostingError(null);

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const { latitude, longitude } = position.coords;
            
            const updates = {
                isHosted: true,
                hostLatitude: latitude,
                hostLongitude: longitude,
                maxDistance: distance,
            };

            await db.ref('cards/' + cardId).update(updates);
            setMaxDistanceInput(''); // Clear input on success
        } catch (err: any) {
            if (err.code === 1) { // PERMISSION_DENIED
                setHostingError("Location permission denied. Please enable it in your browser settings.");
            } else {
                setHostingError("Could not get location. Please try again.");
            }
            console.error(err);
        } finally {
            setIsProcessingHostAction(false);
        }
    };

    const handleStopHosting = async () => {
        if (!cardId) return;
        setIsProcessingHostAction(true);
        try {
            const updates = {
                isHosted: false,
                hostLatitude: null,
                hostLongitude: null,
                maxDistance: null,
            };
            await db.ref('cards/' + cardId).update(updates);
        } catch (err: any) {
            setHostingError("Failed to stop hosting session: " + err.message);
        } finally {
            setIsProcessingHostAction(false);
        }
    };

    if (loading) {
        return <p className="text-gray-400">Loading card details...</p>;
    }

    if (error) {
        return (
            <div className="text-center">
                <p className="text-red-400 text-xl">{error}</p>
                <Link to="/" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
                    <ChevronLeftIcon /> Go to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition">
                    <ChevronLeftIcon />
                    Back to Dashboard
                </Link>
                <button onClick={handleDelete} className="flex items-center gap-2 text-red-400 hover:text-white hover:bg-red-500/20 px-3 py-2 rounded-lg transition">
                    <TrashIcon />
                    <span>Delete Card & Logs</span>
                </button>
            </div>

            {card && (
                <>
                    <div className={`${card.color} p-8 rounded-xl shadow-2xl border border-gray-700`}>
                        <h1 className="text-4xl font-bold text-white break-words">{card.title}</h1>
                        <p className="text-sm text-gray-300 mt-2 mb-6">Card ID: {card.id}</p>
                        {card.createdAt && (
                             <p className="text-sm text-gray-300 mb-6">
                                 Created on: {new Date(card.createdAt).toLocaleDateString()}
                             </p>
                        )}
                        <p className="text-lg text-gray-200 whitespace-pre-wrap break-words">{card.description}</p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-700">
                        <h2 className="text-2xl font-bold text-white mb-4">Host Attendance</h2>
                        {card.isHosted ? (
                            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-400">Status</label>
                                        <p className="text-lg text-green-400 font-semibold">Session is Live</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-400">Host Location</label>
                                        <p className="text-lg">{`Lat: ${card.hostLatitude?.toFixed(4)}, Long: ${card.hostLongitude?.toFixed(4)}`}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-400">Max Distance</label>
                                        <p className="text-lg">{card.maxDistance} meters</p>
                                    </div>
                                    <button
                                        onClick={handleStopHosting}
                                        disabled={isProcessingHostAction}
                                        className="w-full mt-4 bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 transition duration-300 disabled:bg-gray-500"
                                    >
                                        {isProcessingHostAction ? 'Stopping...' : 'Stop Hosting Session'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
                                <p className="text-gray-400 mb-4">Start a session to allow others to sign attendance based on their proximity to your location.</p>
                                <div className="space-y-4">
                                    <input
                                        type="number"
                                        placeholder="Max distance in meters (e.g., 50)"
                                        value={maxDistanceInput}
                                        onChange={(e) => setMaxDistanceInput(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    {hostingError && <p className="text-red-400 text-sm">{hostingError}</p>}
                                    <button
                                        onClick={handleStartHosting}
                                        disabled={isProcessingHostAction}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:bg-gray-500"
                                    >
                                        <LocationMarkerIcon />
                                        {isProcessingHostAction ? 'Getting location...' : 'Start Hosting Session'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-700">
                        <h2 className="text-2xl font-bold text-white mb-4">Public Submissions</h2>
                        {submissions.length === 0 ? (
                            <p className="text-gray-400">No public submissions found for this card.</p>
                        ) : (
                           <div className="overflow-x-auto bg-gray-900/50 rounded-lg border border-gray-700">
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-gray-700 text-xs text-gray-300 uppercase">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Identifier</th>
                                            <th scope="col" className="px-6 py-3">Name / Value</th>
                                            <th scope="col" className="px-6 py-3">Time</th>
                                            <th scope="col" className="px-6 py-3">Device ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map(sub => (
                                            <tr key={sub.id} className="border-b border-gray-700">
                                                <td className="px-6 py-4 font-medium text-white">{sub.identifier}</td>
                                                <td className="px-6 py-4">{sub.name}</td>
                                                <td className="px-6 py-4">{new Date(sub.timestamp).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-gray-400 text-xs truncate" style={{maxWidth: '100px'}} title={sub.deviceId}>{sub.deviceId || 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                           </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-700">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><CalendarIcon /> Attendance Logs</h2>
                         <div className="mb-4">
                            <label htmlFor="log-date" className="block text-sm font-medium text-gray-400 mb-1">Select Date</label>
                            <input
                                type="date"
                                id="log-date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-4 py-2 bg-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        {loadingLogs ? (
                            <p>Loading logs...</p>
                        ) : logs.length === 0 ? (
                            <p className="text-gray-400">No attendance logs found for {selectedDate}.</p>
                        ) : (
                           <div className="overflow-x-auto bg-gray-900/50 rounded-lg border border-gray-700">
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-gray-700 text-xs text-gray-300 uppercase">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Name</th>
                                            <th scope="col" className="px-6 py-3">Time</th>
                                            <th scope="col" className="px-6 py-3">Distance (m)</th>
                                            <th scope="col" className="px-6 py-3">Assigned To</th>
                                            <th scope="col" className="px-6 py-3">Device ID</th>
                                            <th scope="col" className="px-6 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => (
                                            <tr key={log.id} className="border-b border-gray-700">
                                                <td className="px-6 py-4 font-medium text-white">{log.name}</td>
                                                <td className="px-6 py-4">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                                <td className="px-6 py-4">{log.distance.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-gray-300">{log.assignedIdentifier || 'N/A'}</td>
                                                <td className="px-6 py-4 text-gray-400 text-xs truncate" style={{maxWidth: '100px'}} title={log.deviceId}>{log.deviceId || 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${log.status === 'valid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                           </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default CardDetailsPage;