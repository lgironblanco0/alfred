export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <p className="footer__brand">NOCTUA</p>
          <p className="footer__tag">Restaurante &amp; Hotel Boutique</p>
        </div>

        <div>
          <p className="footer__label">Visítanos</p>
          <p>
            Carretera de la Sierra, 14
            <br />
            28410 Madrid
          </p>
        </div>

        <div>
          <p className="footer__label">Reservas</p>
          <p>
            <a href="tel:+34910000000">+34 910 00 00 00</a>
            <br />
            <a href="mailto:reservas@noctua.example">reservas@noctua.example</a>
          </p>
        </div>

        <div>
          <p className="footer__label">Síguenos</p>
          <p>
            <a href="#inicio">Instagram</a>
            <br />
            <a href="#inicio">Journal</a>
          </p>
        </div>
      </div>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} NOCTUA. Todos los derechos reservados.</span>
        <span>Proyecto ficticio · Diseño de demostración</span>
      </div>
    </footer>
  );
}
