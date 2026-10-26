import { Footer } from "./components/Footer";
import { Gallery } from "./components/Gallery";
import { Gastronomy } from "./components/Gastronomy";
import { Hero } from "./components/Hero";
import { Hotel } from "./components/Hotel";
import { Nav } from "./components/Nav";
import { Reservation } from "./components/Reservation";
import { Story } from "./components/Story";

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Story />
        <Gastronomy />
        <Hotel />
        <Gallery />
        <Reservation />
      </main>
      <Footer />
    </>
  );
}
