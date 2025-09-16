import React, { useState, useEffect, useCallback } from 'react';
import { useCookie } from './hooks/useCookie';
import { fetchUsers, addUser, updateUser, fetchCurrentSession, writeAttendanceRecord } from './services/firebaseService';
import { getDeviceInfo } from './utils/deviceInfo';
import type { User, CurrentSession, GeoLocation, AttendanceRecord } from './types';
import LoginForm from './components/LoginForm';
import WelcomeScreen from './components/WelcomeScreen';
import LoadingSpinner from './components/LoadingSpinner';

const App: React.FC = () => {
  const [cardId, setCardId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<CurrentSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userCookie, setUserCookie] = useCookie('markit-user', '');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('cardid');
    if (id) {
      setCardId(id);
    } else {
      setError('No attendance card ID found in the URL. Please use the link provided.');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cardId) {
      if (!new URLSearchParams(window.location.search).get('cardid')) {
        setLoading(false);
      }
      return;
    }

    const verifyUser = async () => {
      if (userCookie) {
        setLoading(true);
        try {
          const userDataFromCookie: User = JSON.parse(userCookie);
          if (!userDataFromCookie.id || !userDataFromCookie.sessionId) {
            throw new Error("Invalid user data in cookie");
          }

          const [allUsers, sessionData] = await Promise.all([
            fetchUsers(cardId),
            fetchCurrentSession(cardId)
          ]);

          const userInDb = Object.values(allUsers).find(
            u => u.id.toLowerCase() === userDataFromCookie.id.toLowerCase()
          );
          
          if (userInDb && userInDb.sessionId === userDataFromCookie.sessionId) {
            // Sync user data from DB to ensure attendance is up-to-date
            const syncedUser = { ...userDataFromCookie, attendance: userInDb.attendance };
            setCurrentUser(syncedUser);
            setCurrentSession(sessionData);
          } else {
            setCurrentUser(null);
            setUserCookie('', 0);
          }
        } catch (err) {
          console.error('Failed to verify session:', err);
          setError('Could not verify your session. Please sign in again.');
          setCurrentUser(null);
          setUserCookie('', 0);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    verifyUser();
  }, [cardId, userCookie, setUserCookie]);

  const handleSignIn = useCallback(async (userId: string, fullName: string) => {
    if (!cardId) {
      setError('Cannot sign in without a valid card ID.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const existingUsers = await fetchUsers(cardId);
      
      const userEntry = Object.entries(existingUsers).find(
        ([, user]) => user.id.toLowerCase() === userId.toLowerCase()
      );
      
      let userToSet: User;

      if (userEntry) {
        const [userKey, existingUser] = userEntry;
        if (existingUser.sessionId) {
          setError('This ID is already signed in on another device.');
          setLoading(false);
          return;
        }

        const sessionId = crypto.randomUUID();
        userToSet = { 
          ...existingUser,
          name: fullName, // Update name on login
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
        };

        await updateUser(cardId, userKey, { sessionId: sessionId, timestamp: userToSet.timestamp, name: fullName });
      } else {
        const sessionId = crypto.randomUUID();
        userToSet = { 
            id: userId, 
            name: fullName, 
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            attendance: {}
        };
        await addUser(cardId, userToSet);
      }
      
      const sessionData = await fetchCurrentSession(cardId);
      setCurrentSession(sessionData);
      setCurrentUser(userToSet);
      setUserCookie(JSON.stringify(userToSet), 365);

    } catch (err) {
      console.error(err);
      setError('An error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [cardId, setUserCookie]);

  const handleMarkAttendance = async (location: GeoLocation) => {
    if (!currentUser || !cardId || !currentSession) return;
    
    setLoading(true);
    setError(null);

    try {
        const existingUsers = await fetchUsers(cardId);
        const userEntry = Object.entries(existingUsers).find(
          ([, user]) => user.id.toLowerCase() === currentUser.id.toLowerCase()
        );

        if (userEntry) {
            const [userKey] = userEntry;
            
            const attendanceRecord: AttendanceRecord = {
                sessionId: currentSession.createdAt,
                timestamp: new Date().toISOString(),
                location: location,
                deviceInfo: getDeviceInfo(),
                userId: currentUser.id,
                userName: currentUser.name,
            };

            const { name: newRecordKey } = await writeAttendanceRecord(cardId, userKey, attendanceRecord);

            // Optimistically update local state
            const { userId, userName, ...userAttendanceRecord } = attendanceRecord;
            const updatedUser = { 
                ...currentUser, 
                attendance: {
                    ...(currentUser.attendance || {}),
                    [newRecordKey]: userAttendanceRecord
                }
            };
            setCurrentUser(updatedUser);
            setUserCookie(JSON.stringify(updatedUser), 365);
        } else {
            throw new Error("Could not find user to update attendance for.");
        }
    } catch (err) {
        console.error("Failed to mark attendance", err);
        setError("Could not save your attendance. Please try again.");
    } finally {
        setLoading(false);
    }
  };


  const renderContent = () => {
    if (loading && !currentUser) {
      return (
        <div className="flex justify-center items-center h-48">
            <LoadingSpinner className="h-12 w-12 text-indigo-500" />
        </div>
        );
    }

    if (error && !cardId) {
        return (
             <div className="text-center p-8 bg-white dark:bg-gray-800 shadow-2xl rounded-2xl">
                <h1 className="text-2xl font-bold text-red-500">Error</h1>
                <p className="mt-4 text-gray-600 dark:text-gray-300">{error}</p>
            </div>
        );
    }

    if (currentUser) {
      return (
        <WelcomeScreen 
            user={currentUser} 
            session={currentSession}
            onMarkAttendance={handleMarkAttendance}
            loading={loading} 
        />
      );
    }

    return <LoginForm onSignIn={handleSignIn} loading={loading} error={error} />;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        <div className="w-full max-w-md mx-auto">
            <div className="flex items-center justify-center mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h1 className="ml-3 text-4xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">
                    Mark-It
                </h1>
            </div>
            {renderContent()}
        </div>
    </div>
  );
};

export default App;