import { useEffect, useState } from "react";

const links = [
  { href: "#restaurante", label: "Restaurante" },
  { href: "#hotel", label: "Hotel" },
  { href: "#galeria", label: "Galería" },
  { href: "#reservar", label: "Reservar" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", open);
    return () => document.body.classList.remove("menu-open");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className={`nav ${scrolled ? "nav--solid" : ""} ${open ? "nav--open" : ""}`}>
      <a className="nav__brand" href="#inicio" onClick={() => setOpen(false)}>
        <span className="nav__mark" aria-hidden="true">
          N
        </span>
        <span className="nav__name">
          NOCTUA
          <small>Restaurante &amp; Hotel</small>
        </span>
      </a>

      <nav className="nav__links" aria-label="Navegación principal">
        {links.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
      </nav>

      <a className="nav__cta" href="#reservar" onClick={() => setOpen(false)}>
        Reservar mesa
      </a>

      <button
        className="nav__toggle"
        type="button"
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
      </button>

      <div className="nav__drawer" aria-hidden={!open} inert={!open}>
        {links.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
        <p>Carretera de la Sierra, 14 · Madrid</p>
      </div>
    </header>
  );
}
