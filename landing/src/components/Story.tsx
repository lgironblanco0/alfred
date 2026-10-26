import { images } from "../lib/images";
import { Reveal } from "./Reveal";

export function Story() {
  return (
    <section className="section story" id="restaurante">
      <div className="container story__grid">
        <Reveal className="story__heading">
          <p className="eyebrow">01 — La casa</p>
          <h2>
            Un refugio
            <em>al norte de la luz.</em>
          </h2>
        </Reveal>

        <Reveal className="story__body" delay={120}>
          <p className="lead">
            NOCTUA nace de una idea sencilla: que el lujo verdadero es tener tiempo. Tiempo para
            comer, para mirar, para quedarse.
          </p>
          <p>
            Ocupamos una casa entre robles, restaurada sin prisa. Doce mesas, seis habitaciones y
            un bosque que cambia de color con cada estación. Aquí no hay carta extensa ni música
            que compita con la conversación.
          </p>
          <div className="story__facts">
            <div>
              <strong>12</strong>
              <span>mesas</span>
            </div>
            <div>
              <strong>6</strong>
              <span>habitaciones</span>
            </div>
            <div>
              <strong>1</strong>
              <span>estrella Michelin</span>
            </div>
          </div>
        </Reveal>

        <Reveal className="story__image" delay={80}>
          <img src={images.story} alt="Interior de piedra y madera de la casa NOCTUA" loading="lazy" />
          <span className="story__caption">El comedor principal, al caer la tarde.</span>
        </Reveal>
      </div>
    </section>
  );
}
