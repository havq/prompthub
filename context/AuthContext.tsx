
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { UserProfile, Notification, AuthUser } from '../types';
import { fetchApi } from '../services/api/core';
import { listenForNotifications, markNotificationAsRead, markAllNotificationsAsRead as apiMarkAllNotificationsAsRead, deleteNotification as apiDeleteNotification, deleteAllNotifications as apiDeleteAllNotifications } from '../services/api';
import Spinner from '../components/Spinner';
import { loadSettings, getSettings } from '../services/settingsService';
import { sendPasswordResetEmail as apiSendPasswordResetEmail } from '../services/api/users';

interface AuthContextType {
  currentUser: AuthUser | null;
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
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  
  const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
          try {
              // Verify token and get profile from backend
              const data = await fetchApi<{ user: UserProfile }>('auth', '&action=verify', {}, token);
              if (data && data.user) {
                  setUserSession(data.user, token);
              } else {
                  throw new Error("Invalid token response");
              }
          } catch (e) {
              console.error("Session restore failed", e);
              logout();
          }
      }
      await loadSettings();
      setLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);
  
  useEffect(() => {
      let unsubscribe: (() => void) | undefined;
      if (userProfile) {
          unsubscribe = listenForNotifications(userProfile.uid, (newNotifications) => {
              const sorted = newNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setNotifications(sorted);
              const unread = sorted.filter(n => !n.read).length;
              setUnreadNotificationCount(unread);
          });
      }
      return () => {
          if (unsubscribe) unsubscribe();
          setNotifications([]);
          setUnreadNotificationCount(0);
      };
  }, [userProfile]);

  const setUserSession = (profile: UserProfile, token: string) => {
      localStorage.setItem('auth_token', token);
      
      const appUser: AuthUser = {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.username,
          photoURL: profile.photoURL || null,
          // Mock provider data for compat
          providerData: [{ providerId: 'custom' }] 
      };
      
      setCurrentUser(appUser);
      setUserProfile(profile);
      setIsAdmin(profile.role === 'Admin');
      setIsPro(!!profile.isPro);
  };

  const login = async (identifier: string, password: string, rememberMe: boolean) => {
    const data = await fetchApi<{ token: string, user: UserProfile }>('auth', '&action=login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password })
    });
    
    if (data.token && data.user) {
        setUserSession(data.user, data.token);
    } else {
        throw new Error("Login failed: Invalid response from server.");
    }
  };

  const loginWithGoogle = async () => {
    return new Promise<void>((resolve, reject) => {
        // @ts-ignore
        if (typeof google === 'undefined') {
             reject(new Error("Google Identity Services script not loaded."));
             return;
        }

        const settings = getSettings();
        // Important: Trim the Client ID to remove any accidental whitespace
        const clientId = settings.googleClientId ? settings.googleClientId.trim() : "";

        if (!clientId) {
            reject(new Error("Google Client ID is not configured in Admin Settings."));
            return;
        }
        
        // @ts-ignore
        const client = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
                if (tokenResponse.error) {
                    reject(new Error(`Google Login Error: ${tokenResponse.error_description || tokenResponse.error}`));
                    return;
                }

                if (tokenResponse && tokenResponse.access_token) {
                     try {
                         const data = await fetchApi<{ token: string, user: UserProfile }>('auth', '&action=google', {
                            method: 'POST',
                            body: JSON.stringify({ accessToken: tokenResponse.access_token })
                         });
                         setUserSession(data.user, data.token);
                         resolve();
                     } catch (e) {
                         reject(e);
                     }
                } else {
                    reject(new Error("Google Login Failed: No access token received."));
                }
            },
        });
        client.requestAccessToken();
    });
  };

  const register = async (email: string, password: string, username: string) => {
    const data = await fetchApi<{ token: string, user: UserProfile }>('auth', '&action=register', {
        method: 'POST',
        body: JSON.stringify({ email, password, username })
    });
    
    if (data.token && data.user) {
        setUserSession(data.user, data.token);
    }
  };

  const logout = async () => {
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setUserProfile(null);
    setIsAdmin(false);
    setIsPro(false);
    setNotifications([]);
  };
  
  const updateUserProfile = async (profileData: Partial<Omit<UserProfile, 'uid'>>) => {
      if (!userProfile) throw new Error("No user logged in.");
      // Just call the user update API
      await fetchApi('users', `&uid=${userProfile.uid}`, {
          method: 'PUT',
          body: JSON.stringify(profileData)
      });
      await refetchUserProfile();
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    // Placeholder for password change
    console.warn("Change password is not fully implemented in this custom auth demo.");
    return true; 
  };

  const sendPasswordResetEmail = async (email: string) => {
      // Use the new API function
      await apiSendPasswordResetEmail(email);
  };
  
  // Notification methods
  const markAsRead = async (notificationId: string, type: Notification['type']) => {
    if (!userProfile) return;
    const originalNotifications = notifications;
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    try {
        await markNotificationAsRead(userProfile.uid, notificationId, type);
    } catch (error) {
        setNotifications(originalNotifications);
        setUnreadNotificationCount(originalNotifications.filter(n => !n.read).length);
    }
  };

  const markAllAsRead = async (type?: Notification['type']) => {
     if (!userProfile) return;
     const original = notifications;
     setNotifications(prev => prev.map(n => ({...n, read: true})));
     setUnreadNotificationCount(0);
     try {
       await apiMarkAllNotificationsAsRead(userProfile.uid, type);
     } catch(e) {
         setNotifications(original);
     }
  };

  const deleteNotification = async (notificationId: string) => {
      if (!userProfile) return;
      const original = notifications;
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      try {
          await apiDeleteNotification(userProfile.uid, notificationId);
      } catch(e) {
          setNotifications(original);
      }
  };

  const deleteAllNotifications = async () => {
      if (!userProfile) return;
      setNotifications([]);
      setUnreadNotificationCount(0);
      try {
          await apiDeleteAllNotifications(userProfile.uid);
      } catch(e) {}
  };


  const refetchUserProfile = async () => {
    if (!currentUser) return;
    try {
      const profile = await fetchApi<UserProfile>('users', `&uid=${currentUser.uid}`);
      if (profile) {
          setUserProfile(profile);
          setIsAdmin(profile.role === 'Admin');
          setIsPro(!!profile.isPro);
      }
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
