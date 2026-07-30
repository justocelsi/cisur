"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthProvider";
import { safeNextPath } from "@/lib/utils";

/**
 * Ingreso, registro y recuperación de contraseña en una sola pantalla.
 *
 * Tres modos en vez de tres páginas: la mayoría de la gente llega acá desde el
 * botón de compra y no tiene idea de si ya tiene cuenta o no. Cambiar de
 * pestaña es más barato que volver atrás y buscar otro link.
 */
export default function FormularioIngreso() {
  const router = useRouter();
  const params = useSearchParams();
  const { ingresar, registrarse, pedirResetPassword, autenticado, cargando } =
    useAuth();

  const destino = safeNextPath(params.get("next"));
  const inviteToken = params.get("invite") ?? null;

  // Con un token de invitación, lo que corresponde es crear la cuenta.
  const [modo, setModo] = useState(inviteToken ? "registro" : "ingreso");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [enCurso, setEnCurso] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  // Si ya hay sesión, no tiene sentido mostrar el formulario.
  useEffect(() => {
    if (!cargando && autenticado) router.replace(destino);
  }, [cargando, autenticado, destino, router]);

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    setAviso(null);
    setEnCurso(true);

    if (modo === "ingreso") {
      const { error: err } = await ingresar({ email, password });
      setEnCurso(false);
      if (err) return setError(err);
      router.replace(destino);
      return;
    }

    if (modo === "registro") {
      const { error: err } = await registrarse({
        email,
        password,
        nombre,
        inviteToken,
      });
      setEnCurso(false);
      if (err) return setError(err);
      // La confirmación de mail está desactivada, así que el signUp ya deja
      // sesión abierta y onAuthStateChange dispara el redirect del useEffect.
      setAviso("¡Listo! Ya tenés cuenta.");
      return;
    }

    const { error: err } = await pedirResetPassword(email);
    setEnCurso(false);
    if (err) return setError(err);
    setAviso(
      "Si ese mail tiene una cuenta, te enviamos un link para crear una contraseña nueva. Revisá también la carpeta de spam.",
    );
  }

  const titulos = {
    ingreso: "Ingresá a tu cuenta",
    registro: inviteToken ? "Creá tu cuenta de editora" : "Creá tu cuenta",
    reset: "Recuperar la contraseña",
  };

  const bajadas = {
    ingreso: "Entrá para leer los materiales que compraste.",
    registro: inviteToken
      ? "Estás usando una invitación: al registrarte vas a poder editar el sitio."
      : "Con una cuenta guardás tus materiales y los leés desde cualquier dispositivo.",
    reset: "Te mandamos un mail con un link para cambiarla.",
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-[2.1rem] leading-tight text-tinta">{titulos[modo]}</h1>
      <p className="mt-3 text-tinta-suave">{bajadas[modo]}</p>

      <form onSubmit={enviar} className="mt-9 space-y-5">
        {modo === "registro" ? (
          <div>
            <label htmlFor="nombre" className="versalitas block text-tinta-tenue">
              Tu nombre
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
              className="mt-2 w-full rounded-[2px] border border-papel-3 bg-white px-4 py-3 font-serif text-[1.19rem] text-tinta focus:border-verde"
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="email" className="versalitas block text-tinta-tenue">
            Mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-2 w-full rounded-[2px] border border-papel-3 bg-white px-4 py-3 font-serif text-[1.19rem] text-tinta focus:border-verde"
          />
        </div>

        {modo !== "reset" ? (
          <div>
            <label
              htmlFor="password"
              className="versalitas block text-tinta-tenue"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                modo === "registro" ? "new-password" : "current-password"
              }
              className="mt-2 w-full rounded-[2px] border border-papel-3 bg-white px-4 py-3 font-serif text-[1.19rem] text-tinta focus:border-verde"
            />
            {modo === "registro" ? (
              <p className="mt-2 text-[0.95rem] text-tinta-tenue">
                Mínimo 6 caracteres.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-[2px] border border-alerta/30 bg-alerta/5 px-4 py-3 text-[1.05rem] text-alerta"
          >
            {error}
          </p>
        ) : null}

        {aviso ? (
          <p
            role="status"
            className="rounded-[2px] border border-salvia bg-salvia-tenue/40 px-4 py-3 text-[1.05rem] text-verde"
          >
            {aviso}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enCurso}
          className="w-full rounded-[2px] bg-verde px-6 py-3.5 text-papel transition-colors hover:bg-verde-oscuro disabled:opacity-60"
        >
          {enCurso
            ? "Un momento…"
            : modo === "ingreso"
              ? "Ingresar"
              : modo === "registro"
                ? "Crear mi cuenta"
                : "Enviarme el link"}
        </button>
      </form>

      <hr className="filete my-8" />

      <div className="space-y-3 text-[1.05rem]">
        {modo !== "ingreso" ? (
          <p>
            <button
              type="button"
              onClick={() => {
                setModo("ingreso");
                setError(null);
                setAviso(null);
              }}
              className="text-verde underline decoration-salvia underline-offset-4"
            >
              Ya tengo cuenta, quiero ingresar
            </button>
          </p>
        ) : null}

        {modo !== "registro" ? (
          <p>
            <button
              type="button"
              onClick={() => {
                setModo("registro");
                setError(null);
                setAviso(null);
              }}
              className="text-verde underline decoration-salvia underline-offset-4"
            >
              No tengo cuenta, quiero crear una
            </button>
          </p>
        ) : null}

        {modo !== "reset" ? (
          <p>
            <button
              type="button"
              onClick={() => {
                setModo("reset");
                setError(null);
                setAviso(null);
              }}
              className="text-tinta-tenue underline decoration-papel-3 underline-offset-4 hover:text-verde"
            >
              Me olvidé la contraseña
            </button>
          </p>
        ) : null}
      </div>

      <p className="mt-10 text-[0.95rem] leading-relaxed text-tinta-tenue">
        Al crear una cuenta aceptás los{" "}
        <Link href="/legales/terminos" className="underline">
          términos y condiciones
        </Link>{" "}
        y la{" "}
        <Link href="/legales/privacidad" className="underline">
          política de privacidad
        </Link>
        .
      </p>
    </div>
  );
}
