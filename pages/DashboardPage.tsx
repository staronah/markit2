import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { Card } from '../types';
import { Link } from 'react-router-dom';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import { PlusIcon } from '../components/icons';

const CreateCardModal: React.FC<{ onClose: () => void; onCardCreated: () => void; }> = ({ onClose, onCardCreated }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Title is required.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) throw new Error("User not authenticated");
            
            // 1. Get a new key for the card
            const newCardKey = db.ref('cards').push().key;
            if (!newCardKey) throw new Error("Could not generate card key.");

            const newCardData = {
                userId,
                title,
                description,
                color: 'bg-gray-700',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
            };

            // 2. Prepare multi-path update
            const updates: { [key: string]: any } = {};
            updates[`/cards/${newCardKey}`] = newCardData;
            updates[`/users/${userId}/cards/${newCardKey}`] = true;

            // 3. Execute the atomic update
            await db.ref().update(updates);

            onCardCreated();
            onClose();
        } catch (err: any) {
            console.error("Error creating card:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md border border-gray-700">
                <h2 className="text-2xl font-bold mb-6 text-white">Create a new card</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Card Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <textarea
                        placeholder="Card Description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 transition">Cancel</button>
                        <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition disabled:bg-gray-500">{loading ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) {
            setLoading(false);
            return;
        }

        const userCardsRef = db.ref(`users/${userId}/cards`);

        const listener = userCardsRef.on('value', async (snapshot) => {
            const cardIdsData = snapshot.val();
            if (cardIdsData) {
                const cardIds = Object.keys(cardIdsData);
                try {
                    const cardPromises = cardIds.map(id =>
                        db.ref(`cards/${id}`).get().then(snap => {
                            if (snap.exists()) {
                                return { id, ...snap.val() };
                            }
                            return null; // Handle cases where card data might not exist
                        })
                    );
                    
                    const fetchedCardsData = await Promise.all(cardPromises);
                    
                    const validCards = fetchedCardsData.filter(card => card !== null) as Card[];
                    
                    validCards.sort((a, b) => b.createdAt - a.createdAt);
                    
                    setCards(validCards);
                } catch (error) {
                    console.error("Error fetching card details:", error);
                    setCards([]);
                }
            } else {
                setCards([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user's card list:", error);
            setLoading(false);
        });

        return () => userCardsRef.off('value', listener);
    }, []);

    return (
        <div>
            {isModalOpen && <CreateCardModal onClose={() => setIsModalOpen(false)} onCardCreated={() => { /* Can add toast notification here */ }} />}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-white">Dashboard</h1>
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300">
                    <PlusIcon />
                    <span>New Card</span>
                </button>
            </div>

            {loading ? (
                <p className="text-gray-400">Loading your cards...</p>
            ) : cards.length === 0 ? (
                <div className="text-center py-20 bg-gray-900/50 rounded-lg border border-gray-700">
                    <h2 className="text-2xl text-white">Your canvas is empty</h2>
                    <p className="text-gray-400 mt-2">Click 'New Card' to start creating.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {cards.map(card => (
                        <Link to={`/card/${card.id}`} key={card.id} className={`block p-6 rounded-xl ${card.color} border border-transparent hover:border-indigo-400 transition-transform transform hover:-translate-y-1 shadow-lg hover:shadow-indigo-500/20`}>
                           <h3 className="font-bold text-xl text-white truncate">{card.title}</h3>
                           <p className="text-gray-300 mt-2 text-sm h-10 overflow-hidden">{card.description || 'No description'}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DashboardPage;