import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const USER_STORAGE_KEY = 'margrakshak_token_user'; // alias handled below
export const TOKEN_STORAGE_KEY = 'margrakshak_token';
const LEGACY_USER_STORAGE_KEY = 'margrakshak_user';

/**
 * Derives a human-friendly display name from an input string (email, username, etc.)
 */
export function formatNameFromIdentifier(identifier, fallbackRole = 'User') {
  if (!identifier || typeof identifier !== 'string') {
    return fallbackRole === 'admin' ? 'Admin User' : 'Driver User';
  }

  const trimmed = identifier.trim();
  if (!trimmed) {
    return fallbackRole === 'admin' ? 'Admin User' : 'Driver User';
  }

  // If already contains spaces and looks like a full name (and no @), return it trimmed
  if (trimmed.includes(' ') && !trimmed.includes('@')) {
    return trimmed;
  }

  // If it's an email, extract the local part before '@'
  let rawName = trimmed;
  if (trimmed.includes('@')) {
    rawName = trimmed.split('@')[0];
  }

  // If it is entirely digits (e.g. phone number)
  if (/^\+?\d+$/.test(rawName)) {
    return fallbackRole === 'admin' ? 'Admin Officer' : 'Driver Partner';
  }

  // Replace common separators with spaces and title-case each word
  const words = rawName
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return fallbackRole === 'admin' ? 'Admin User' : 'Driver User';
  }

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY) || localStorage.getItem(LEGACY_USER_STORAGE_KEY);
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error('Failed to parse saved user from localStorage:', e);
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    try {
      const rawToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (rawToken && rawToken !== 'null' && rawToken !== 'undefined') {
        let cleaned = rawToken.trim();
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
          cleaned = cleaned.slice(1, -1).trim();
        }
        return cleaned || null;
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  const login = (userData, authToken = null) => {
    let normalizedUser = null;

    if (typeof userData === 'string') {
      normalizedUser = {
        full_name: formatNameFromIdentifier(userData),
        email: userData.includes('@') ? userData : '',
        role: 'user',
      };
    } else if (userData && typeof userData === 'object') {
      const fullName = userData.full_name?.trim() ||
        userData.name?.trim() ||
        (userData.email ? formatNameFromIdentifier(userData.email, userData.role) : '') ||
        (userData.role === 'admin' ? 'Admin User' : 'Driver User');

      normalizedUser = {
        ...userData,
        full_name: fullName,
      };
    }

    setUser(normalizedUser);
    if (normalizedUser) {
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
        localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
      } catch (e) {
        console.error('Failed to persist user in localStorage:', e);
      }
    }

    // Resolve token whether passed as 2nd argument or found inside userData (e.g. data.access_token)
    let resolvedToken = authToken;
    if (!resolvedToken && userData && typeof userData === 'object') {
      resolvedToken = userData.access_token || userData.token || null;
    }

    if (resolvedToken && typeof resolvedToken === 'string') {
      let cleaned = resolvedToken.trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      if (cleaned && cleaned !== 'null' && cleaned !== 'undefined') {
        setToken(cleaned);
        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, cleaned);
        } catch (e) {
          console.error('Failed to persist token in localStorage:', e);
        }
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(LEGACY_USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear auth from localStorage:', e);
    }
  };

  const updateUser = (partialData) => {
    setUser((prev) => {
      const updated = { ...(prev || {}), ...partialData };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to persist updated user in localStorage:', e);
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        setIsLoading,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
