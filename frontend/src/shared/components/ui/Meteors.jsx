import { useEffect, useState } from 'react';

/**
 * Efecto visual de meteoros animados para fondos decorativos.
 * Genera N elementos con posicion, retardo y duracion aleatorios.
 * @component
 * @param {Object} props
 * @param {number} [props.number=20] - Cantidad de meteoros a renderizar.
 * @returns {JSX.Element}
 */
export default function Meteors({ number = 20 }) {
  const [meteors, setMeteors] = useState([]);

  useEffect(() => {
    setMeteors(
      Array.from({ length: number }, (_, i) => ({
        id: i,
        top: Math.floor(Math.random() * 100),
        left: Math.floor(Math.random() * 100),
        delay: (Math.random() * 0.6 + 0.2).toFixed(2),
        duration: Math.floor(Math.random() * 8) + 2,
      }))
    );
  }, [number]);

  return (
    <>
      {meteors.map((m) => (
        <span
          key={m.id}
          className="pointer-events-none absolute h-0.5 w-0.5 rotate-[215deg] animate-meteor rounded-full bg-slate-500 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
          style={{
            top: `${m.top}%`,
            left: `${m.left}%`,
            animationDelay: `${m.delay}s`,
            animationDuration: `${m.duration}s`,
          }}
        >
          <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-[50px] -translate-y-1/2 bg-gradient-to-r from-slate-400 to-transparent" />
        </span>
      ))}
    </>
  );
}
