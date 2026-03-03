// hooks/useAdmin.js
import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const adminRef = ref(db, `admins/${user.uid}`);
    const unsubscribe = onValue(adminRef, (snapshot) => {
      setIsAdmin(snapshot.val() === true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isAdmin, loading };
}