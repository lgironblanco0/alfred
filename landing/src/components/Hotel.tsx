import { images } from "../lib/images";
import { Reveal } from "./Reveal";

export function Hotel() {
  return (
    <section className="section hotel" id="hotel">
      <div className="container hotel__grid">
        <Reveal className="hotel__media">
          <img src={images.hotel} alt="Habitación del hotel boutique con vistas al bosque" loading="lazy" />
          <div className="hotel__stamp">
            <span>Seis</span>
            <span>habitaciones</span>
          </div>
        </Reveal>

        <Reveal className="hotel__body" delay={120}>
          <p className="eyebrow">03 — El reposo</p>
          <h2>
            Quedarse
            <em>es parte del menú.</em>
          </h2>
          <p className="lead">
            Seis habitaciones en la planta alta de la casa. Piedra, lino, madera oscura y silencio.
          </p>
          <ul className="hotel__list">
            <li>
              <span>01</span>
              <div>
                <strong>Habitación Bosque</strong>
                <p>Vista al robledal, bañera de piedra y terraza privada.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Habitación Piedra</strong>
                <p>Techos abovedados, chimenea y cama de lino belga.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Suite Noctua</strong>
                <p>Dos alturas, biblioteca y ventanal sobre la sierra.</p>
              </div>
            </li>
          </ul>
          <a
            className="text-link"
            href="mailto:reservas@noctua.example?subject=Consulta%20de%20estancia"
          >
            Consultar estancia
            <span aria-hidden="true">→</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
