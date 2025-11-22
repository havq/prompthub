
import React, { createContext, useState, useContext, ReactNode, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getAuth, googleProvider } from '../services/firebaseConfig';
import { UserProfile, Notification, Prompt } from '../types';
import { createUserProfile, getUserProfile, updateUserProfile as apiUpdateUserProfile, findUserByUsername, sendPasswordResetEmail as apiSendPasswordResetEmail, mergeAndClearLocalCollections, listenForNotifications, markNotificationAsRead, markAllNotificationsAsRead as apiMarkAllNotificationsAsRead, deleteNotification as apiDeleteNotification, deleteAllNotifications as apiDeleteAllNotifications } from '../services/api';
import Spinner from '../components/Spinner';
import { loadSettings } from '../services/settingsService';

interface AuthContextType {
  currentUser: firebase.User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isPro: boolean;
  loading: boolean;
  notifications: Notification[];
  unreadNotificationCount: number;
  register: (email: string, password: string, username: string) => Promise<void>;
  login: (identifier: string, password: string, rememberMe: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (profileData: Partial<Omit<UserProfile, 'uid'>>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  markAsRead: (notificationId: string, type: Notification['type']) => Promise<void>;
  markAllAsRead: (type?: Notification['type']) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refetchUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<firebase.User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  // Ref to track if this is the initial auth state check
  const isInitialAuthCheck = useRef(true);
  
  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
        console.warn("Firebase Auth not available.");
        setLoading(false);
        return;
    }

    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      
      // Reload settings to get user-specific settings (like API keys for logged-in users).
      // Optimization: Skip redundant settings reload on initial guest visit since AppInitializer already loaded public settings.
      if (isInitialAuthCheck.current && !user) {
          // Do nothing, settings are already loaded
      } else {
          await loadSettings();
      }
      isInitialAuthCheck.current = false;

      if (user) {
        await mergeAndClearLocalCollections(user.uid);
        let profile = await getUserProfile(user.uid);
        
        // If an authenticated user does not have a profile, create one.
        if (!profile) {
            const username = user.displayName || user.email?.split('@')[0] || `user_${user.uid.substring(0, 5)}`;
            const email = user.email;
            if (email) {
                // Assign 'Admin' role if the email matches the special admin email.
                const role = email === 'admin@testapp.ai' ? 'Admin' : 'User';
                await createUserProfile(user.uid, username, email, role);
                // Re-fetch the profile after creating it.
                profile = await getUserProfile(user.uid);
            } else {
                console.error(`User with UID ${user.uid} is authenticated but has no email. Cannot create profile.`);
            }
        }
        
        // Sync email from Firebase Auth to the database if it has changed
        if (profile && user.email && profile.email !== user.email) {
            try {
                // The email in Firebase Auth is the source of truth.
                // Update our database to match it.
                await apiUpdateUserProfile(user.uid, { email: user.email });
                // Update the profile object in memory for the current session.
                profile.email = user.email;
            } catch (error) {
                console.error("Failed to sync user email with database:", error);
            }
        }
        
        setUserProfile(profile);
        setIsAdmin(profile?.role === 'Admin');
        setIsPro(!!profile?.isPro);
      } else {
        setUserProfile(null);
        setIsAdmin(false);
        setIsPro(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);
  
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (currentUser) {
        unsubscribe = listenForNotifications(currentUser.uid, (newNotifications) => {
            const sorted = newNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotifications(sorted);
            const unread = sorted.filter(n => !n.read).length;
            setUnreadNotificationCount(unread);
        });
    }
    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
        setNotifications([]);
        setUnreadNotificationCount(0);
    };
}, [currentUser]);

  const login = async (identifier: string, password: string, rememberMe: boolean) => {
    const auth = getAuth();
    if (!auth) throw new Error("Auth service is not available.");

    const persistence = rememberMe 
      ? firebase.auth.Auth.Persistence.LOCAL 
      : firebase.auth.Auth.Persistence.SESSION;

    try {
      await auth.setPersistence(persistence);
    } catch (error) {
      console.warn(`Could not set persistence to ${persistence}, falling back to SESSION.`, error);
      if (persistence === firebase.auth.Auth.Persistence.LOCAL) {
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
      }
    }

    let userEmail = identifier;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);

    if (!isEmail) {
      const profile = await findUserByUsername(identifier);
      if (profile && profile.email) {
        userEmail = profile.email;
      } else {
        const error: any = new Error("Invalid username/email or password.");
        error.code = 'auth/invalid-credential'; 
        throw error;
      }
    }
    
    await auth.signInWithEmailAndPassword(userEmail, password);
  };

  const loginWithGoogle = async () => {
    const auth = getAuth();
    if (!auth) throw new Error("Auth service is not available.");

    const result = await auth.signInWithPopup(googleProvider);
    const user = result.user;
    if (!user) throw new Error("Google Sign-In failed.");
    
    // CRITICAL FIX: Force token refresh to ensure the internal Firebase state 
    // has a valid token ready for the subsequent API calls (fetchApi).
    // This prevents "Authentication required" errors due to race conditions.
    await user.getIdToken(true);
    
    const profile = await getUserProfile(user.uid);
    
    if (!profile) {
        const username = user.displayName || 'New User';
        const email = user.email;
        if (!email) throw new Error("Email not provided by Google.");
        await createUserProfile(user.uid, username, email, 'User');
    }
  };

  const register = async (email: string, password: string, username: string) => {
    const auth = getAuth();
    if (!auth) throw new Error("Auth service is not available.");
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user) throw new Error("User creation failed.");
    
    await user.updateProfile({ displayName: username });
    
    // Ensure token is ready for profile creation
    await user.getIdToken(true);

    const role = email === 'admin@testapp.ai' ? 'Admin' : 'User';
    await createUserProfile(user.uid, username, email, role);
    
    const profile = await getUserProfile(user.uid);
    setCurrentUser(user);
    setUserProfile(profile);
    setIsAdmin(profile?.role === 'Admin');
    setIsPro(!!profile?.isPro);
  };

  const logout = async () => {
    const auth = getAuth();
    if (!auth) throw new Error("Auth service is not available.");
    await auth.signOut();
  };
  
  const updateUserProfile = async (profileData: Partial<Omit<UserProfile, 'uid'>>) => {
      if (!currentUser) throw new Error("No user is logged in.");
      
      // Update the main user profile in the database (RTDB/Firestore).
      // This can handle long base64 strings for photoURL.
      await apiUpdateUserProfile(currentUser.uid, profileData);
      
      // Prepare data for updating the Firebase Auth user record.
      const authProfileUpdate: { displayName?: string; photoURL?: string } = {};
      
      if (profileData.username) {
        authProfileUpdate.displayName = profileData.username;
      }
      
      // IMPORTANT: Only update the Firebase Auth photoURL if it's a standard URL.
      // Base64 data URIs are too long and will cause a 'auth/invalid-profile-attribute' error.
      // The base64 string is saved in the database profile (RTDB/Firestore) above.
      if (profileData.photoURL && !profileData.photoURL.startsWith('data:')) {
          authProfileUpdate.photoURL = profileData.photoURL;
      } else if (profileData.hasOwnProperty('photoURL') && !profileData.photoURL) {
          // Handle case where user clears their photo.
          authProfileUpdate.photoURL = '';
      }

      // Only call updateProfile if there's something to update.
      if (Object.keys(authProfileUpdate).length > 0) {
          await currentUser.updateProfile(authProfileUpdate);
      }
      
      // Fetch the updated profile from the database to refresh the app's state.
      const updatedProfile = await getUserProfile(currentUser.uid);
      setUserProfile(updatedProfile);
      setIsPro(!!updatedProfile?.isPro);
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (!currentUser) throw new Error("No user is logged in.");
    
    try {
        // Only re-authenticate if an old password is provided.
        // Social login users won't have an old password, so they skip this check.
        if (oldPassword) {
            if (!currentUser.email) throw new Error("Current user does not have an email to re-authenticate with.");
            const credential = firebase.auth.EmailAuthProvider.credential(
                currentUser.email,
                oldPassword
            );
            await currentUser.reauthenticateWithCredential(credential);
        }
        
        await currentUser.updatePassword(newPassword);
        return true;
    } catch (error: any) {
        console.error("Password change failed:", error);
        // If the error is about requiring recent login (common for sensitive operations without re-auth),
        // we might need to handle it, but usually reauthenticateWithCredential covers it for password users.
        // For Google users without a password, updatePassword might throw this if the session is old.
        throw error;
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    return apiSendPasswordResetEmail(email);
  };
  
  const markAsRead = async (notificationId: string, type: Notification['type']) => {
    if (!currentUser) return;
    const notification = notifications.find(n => n.id === notificationId);
    // Exit if notification doesn't exist or is already read
    if (!notification || notification.read) return;

    const originalNotifications = notifications;

    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    setUnreadNotificationCount(prev => Math.max(0, prev - 1));

    try {
        await markNotificationAsRead(currentUser.uid, notificationId, type);
    } catch (error) {
        console.error("Failed to mark notification as read:", error);
        // Revert UI on error
        setNotifications(originalNotifications);
        setUnreadNotificationCount(originalNotifications.filter(n => !n.read).length);
        // In a real app, you might show a toast notification to the user here.
    }
  };

  const markAllAsRead = async (type?: Notification['type']) => {
    if (!currentUser || unreadNotificationCount === 0) return;
      
    const originalNotifications = notifications;

    const notificationsToMark = type 
        ? originalNotifications.filter(n => n.type === type && !n.read)
        : originalNotifications.filter(n => !n.read);
    
    if (notificationsToMark.length === 0) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => {
        if (!n.read && (!type || n.type === type)) {
            return { ...n, read: true };
        }
        return n;
    }));
    setUnreadNotificationCount(prev => Math.max(0, prev - notificationsToMark.length));
    
    try {
      await apiMarkAllNotificationsAsRead(currentUser.uid, type);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      // Revert UI on error
      setNotifications(originalNotifications);
      setUnreadNotificationCount(originalNotifications.filter(n => !n.read).length);
      // In a real app, you might show a toast notification to the user here.
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!currentUser) return;

    const originalNotifications = [...notifications];
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadNotificationCount(prev => {
        const notification = originalNotifications.find(n => n.id === notificationId);
        return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });

    try {
        await apiDeleteNotification(currentUser.uid, notificationId);
    } catch (error) {
        console.error("Failed to delete notification:", error);
        // Revert on error
        setNotifications(originalNotifications);
        setUnreadNotificationCount(originalNotifications.filter(n => !n.read).length);
    }
  };

  const deleteAllNotifications = async () => {
    if (!currentUser || notifications.length === 0) return;

    const originalNotifications = [...notifications];
    // Optimistic update
    setNotifications([]);
    setUnreadNotificationCount(0);
    
    try {
      await apiDeleteAllNotifications(currentUser.uid);
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
      // Revert on error
      setNotifications(originalNotifications);
      setUnreadNotificationCount(originalNotifications.filter(n => !n.read).length);
    }
  };


  const refetchUserProfile = async () => {
    if (!currentUser) {
      return;
    }
    try {
      const profile = await getUserProfile(currentUser.uid);
      setUserProfile(profile);
      setIsAdmin(profile?.role === 'Admin');
      setIsPro(!!profile?.isPro);
    } catch (error) {
      console.error("Failed to refetch user profile:", error);
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white font-sans">
            <div className="text-center space-y-4">
                <Spinner size="lg" />
                <p className="text-xl">Initializing Session...</p>
            </div>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, isAdmin, isPro, loading, notifications, unreadNotificationCount, register, login, loginWithGoogle, logout, updateUserProfile, changePassword, sendPasswordResetEmail, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, refetchUserProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
