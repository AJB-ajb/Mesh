import dynamic from "next/dynamic";
import type { PersonaProps } from "./persona";

export const PersonaLazy = dynamic<PersonaProps>(
  () => import("./persona").then((m) => ({ default: m.Persona })),
  { ssr: false },
);
