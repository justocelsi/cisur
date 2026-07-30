"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/app/context/AuthProvider";

/**
 * Destino del link de recuperación que manda Supabase.
 *
 * El SDK tiene detectSessionInUrl activado, así que cuando la persona llega
 * con el token en el fragmento de la URL ya queda con sesión abierta y sólo
 * falta que elija la contraseña nueva.
 */
export default function NuevaClave() {
  const router = useRouter();
  const { cambiarPassword, autenticado, cargando } = useAuth();

  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);

    if (password !== repetida) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }

    setEnCurso(true);
    const { error: err } = await cambiarPassword(password);
    setEnCurso(false);

    if (err) return setError(err);

    setListo(true);
    setTimeout(() => router.replace("/mis-materiales"), 1800);
  }

  if (listo) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-[2.1rem] text-tinta">Contraseña cambiada</h1>
        <p className="mt-4 text-tinta-suave">
          Ya podés usar la nueva. Te llevamos a tus materiales…
        </p>
      </div>
    );
  }

  if (!cargando && !autenticado) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="text-[2.1rem] leading-tight text-tinta">
          El link no es válido
        </h1>
        <p className="mt-4 text-tinta-suave">
          Los links para cambiar la contraseña vencen. Pedí uno nuevo y usalo
          dentro de la hora siguiente.
        </p>
        <Link
          href="/ingresar"
          className="mt-8 inline-block rounded-[2px] bg-verde px-6 py-3 text-papel"
        >
          Pedir un link nuevo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-[2.1rem] leading-tight text-tinta">
        Elegí una contraseña nueva
      </h1>

      <form onSubmit={enviar} className="mt-9 space-y-5">
        <div>
          <label htmlFor="password" className="versalitas block text-tinta-tenue">
            Contraseña nueva
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="mt-2 w-full rounded-[2px] border border-papel-3 bg-white px-4 py-3 font-serif text-[1.19rem] text-tinta focus:border-verde"
          />
          <p className="mt-2 text-[0.95rem] text-tinta-tenue">Mínimo 6 caracteres.</p>
        </div>

        <div>
          <label htmlFor="repetida" className="versalitas block text-tinta-tenue">
            Repetila
          </label>
          <input
            id="repetida"
            type="password"
            required
            minLength={6}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            autoComplete="new-password"
            className="mt-2 w-full rounded-[2px] border border-papel-3 bg-white px-4 py-3 font-serif text-[1.19rem] text-tinta focus:border-verde"
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-[2px] border border-alerta/30 bg-alerta/5 px-4 py-3 text-[1.05rem] text-alerta"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enCurso}
          className="w-full rounded-[2px] bg-verde px-6 py-3.5 text-papel transition-colors hover:bg-verde-oscuro disabled:opacity-60"
        >
          {enCurso ? "Guardando…" : "Guardar la contraseña"}
        </button>
      </form>
    </div>
  );
}
