"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabase } from "@/lib/supabaseClient";
import { mensajeDeError } from "@/lib/errores";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // Si Supabase no está configurado no hay nada que hidratar: arrancamos ya
  // en "listo" y así el efecto no necesita apagar el cargando a mano.
  const [cargando, setCargando] = useState(() => Boolean(getSupabase()));

  // Ningún setState antes del primer await: si no, React avisa (con razón) de
  // renders en cascada disparados desde el cuerpo de un efecto.
  const cargarPerfil = useCallback(async (userId) => {
    const supabase = getSupabase();

    const { data } =
      supabase && userId
        ? await supabase
            .from("profiles")
            .select("id, email, nombre, role")
            .eq("id", userId)
            .maybeSingle()
        : { data: null };

    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let vivo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return;
      setSession(data.session ?? null);
      if (data.session?.user?.id) await cargarPerfil(data.session.user.id);
      if (vivo) setCargando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_evento, nuevaSession) => {
        if (!vivo) return;
        setSession(nuevaSession ?? null);
        if (nuevaSession?.user?.id) {
          await cargarPerfil(nuevaSession.user.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      vivo = false;
      sub?.subscription?.unsubscribe();
    };
  }, [cargarPerfil]);

  const registrarse = useCallback(async ({ email, password, nombre, inviteToken }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "El sitio todavía no está configurado." };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre ?? "",
          // El trigger handle_new_user lo consume y promueve el rol.
          ...(inviteToken ? { invite_token: inviteToken } : {}),
        },
      },
    });

    if (error) return { error: mensajeDeError(error) };
    return { error: null };
  }, []);

  const ingresar = useCallback(async ({ email, password }) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "El sitio todavía no está configurado." };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: mensajeDeError(error) };
    return { error: null };
  }, []);

  const salir = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const pedirResetPassword = useCallback(async (email) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "El sitio todavía no está configurado." };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nueva-clave`,
    });
    if (error) return { error: mensajeDeError(error) };
    return { error: null };
  }, []);

  const cambiarPassword = useCallback(async (password) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "El sitio todavía no está configurado." };

    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: mensajeDeError(error) };
    return { error: null };
  }, []);

  const valor = useMemo(
    () => ({
      session,
      usuario: session?.user ?? null,
      profile,
      cargando,
      autenticado: Boolean(session?.user),
      esEditor: profile?.role === "editor" || profile?.role === "admin",
      esAdmin: profile?.role === "admin",
      registrarse,
      ingresar,
      salir,
      pedirResetPassword,
      cambiarPassword,
    }),
    [
      session,
      profile,
      cargando,
      registrarse,
      ingresar,
      salir,
      pedirResetPassword,
      cambiarPassword,
    ],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth tiene que usarse dentro de <AuthProvider>");
  return ctx;
}
