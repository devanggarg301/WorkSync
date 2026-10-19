import {createContext,useContext,useEffect,useState,} from "react";
import { signOut } from "firebase/auth";
import api from "../api/client";
import { auth } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      try {
        const response = await api.get("/auth/me");

        if (active) {
          setUser(response.data.user);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const login = async (credentials) => {
    const response = await api.post(
      "/auth/login",
      credentials
    );

    setUser(response.data.user);
    return response.data;
  };

  const loginWithFirebase = async (idToken) => {
    const response = await api.post("/auth/firebase", {
      idToken,
    });

    setUser(response.data.user);

    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post(
      "/auth/register",
      userData
    );

    return response.data;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    await signOut(auth).catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{user,loading,login,loginWithFirebase,register,logout}}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }
  return context;
}