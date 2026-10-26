import { images } from "../lib/images";

export function Hero() {
  return (
    <section className="hero" id="inicio">
      <img className="hero__image" src={images.hero} alt="Comedor de NOCTUA al anochecer" />
      <div className="hero__veil" aria-hidden="true" />

      <div className="hero__content">
        <p className="eyebrow eyebrow--light">Sierra de Madrid · desde 1998</p>
        <h1>
          La noche
          <span>se sirve despacio.</span>
        </h1>
        <p className="hero__copy">
          Cocina de autor, fuego y memoria. Un hotel boutique entre piedra, bosque y silencio.
        </p>
        <div className="hero__actions">
          <a className="button button--bronze" href="#reservar">
            Reservar mesa
          </a>
          <a className="button button--ghost" href="#restaurante">
            Descubrir NOCTUA
          </a>
        </div>
      </div>

      <div className="hero__foot">
        <span>40° 53′ N · 3° 43′ O</span>
        <a href="#restaurante" className="hero__scroll">
          <span aria-hidden="true" />
          Desliza
        </a>
      </div>
    </section>
  );
}
