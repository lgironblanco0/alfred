import { images } from "../lib/images";
import { Reveal } from "./Reveal";

const pieces = [
  { image: images.galleryTable, alt: "Mesa preparada en el comedor", caption: "El comedor", wide: true },
  { image: images.galleryWine, alt: "Copas de vino en la bodega", caption: "La bodega" },
  { image: images.galleryChef, alt: "Chef trabajando en cocina", caption: "El fuego" },
  { image: images.galleryBar, alt: "Bar de madera con luz cálida", caption: "El bar" },
];

export function Gallery() {
  return (
    <section className="section gallery" id="galeria">
      <div className="container">
        <Reveal className="gallery__head">
          <p className="eyebrow">04 — Fragmentos</p>
          <h2>
            La casa,
            <em>en silencio.</em>
          </h2>
        </Reveal>

        <div className="gallery__grid">
          {pieces.map((piece, index) => (
            <Reveal
              key={piece.caption}
              className={`gallery__piece ${piece.wide ? "gallery__piece--wide" : ""}`}
              delay={index * 90}
            >
              <img src={piece.image} alt={piece.alt} loading="lazy" />
              <span>{piece.caption}</span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
