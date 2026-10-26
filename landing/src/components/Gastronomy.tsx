import { images } from "../lib/images";
import { Reveal } from "./Reveal";

const dishes = [
  {
    image: images.dishFire,
    alt: "Plato de temporada con brasa y verduras",
    course: "Fuego",
    name: "Brasa de temporada",
    description: "Verduras de la huerta, mantequilla ahumada y yema curada.",
  },
  {
    image: images.dishSea,
    alt: "Pescado de lonja con salsa de mar",
    course: "Mar",
    name: "Lonja del día",
    description: "Pescado de costa, caldo de sus espinas y aceite de hierbas.",
  },
  {
    image: images.dishSweet,
    alt: "Postre de chocolate y sal",
    course: "Dulce",
    name: "Chocolate y sal",
    description: "Cacao de origen, leche de oveja y sal de manantial.",
  },
];

export function Gastronomy() {
  return (
    <section className="section gastronomy">
      <div className="container">
        <Reveal className="gastronomy__intro">
          <p className="eyebrow">02 — La mesa</p>
          <h2>
            Menos platos.
            <em>Más memoria.</em>
          </h2>
          <p>
            Una cocina de proximidad que se escribe cada mañana. Dos menús degustación —seis o
            nueve pases— y una bodega de pequeñas producciones.
          </p>
        </Reveal>

        <div className="gastronomy__grid">
          {dishes.map((dish, index) => (
            <Reveal key={dish.name} className={`dish dish--${index + 1}`} delay={index * 110}>
              <figure>
                <img src={dish.image} alt={dish.alt} loading="lazy" />
              </figure>
              <div className="dish__meta">
                <span className="dish__course">{dish.course}</span>
                <h3>{dish.name}</h3>
                <p>{dish.description}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="gastronomy__note">
          <span>Menú fuego · 6 pases · 95 €</span>
          <span>Menú noctua · 9 pases · 145 €</span>
          <span>Maridaje opcional · 65 €</span>
        </Reveal>
      </div>
    </section>
  );
}
