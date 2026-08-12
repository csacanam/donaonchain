/**
 * Photographs taken by the author in Cali after the earthquake.
 *
 * These are first-hand images, which is exactly why they belong in a letter:
 * they are evidence that the person asking was there, not stock imagery of a
 * generic disaster.
 *
 * Two editorial rules they were selected against:
 *  - No visible casualties, and no identifiable faces in distress. The images
 *    show damaged structures; people appear only at a distance. A page asking
 *    strangers for money must not trade on someone else's worst moment.
 *  - Alt text describes what is actually in the frame. On a page about a
 *    disaster, a screen-reader user deserves the same information as everyone
 *    else, not "photo of earthquake damage" six times.
 */

export type Photo = {
  src: string;
  /** 3:4 portrait, as shot. */
  width: number;
  height: number;
  alt: { en: string; es: string };
};

export const PHOTOS: Photo[] = [
  {
    src: "/photos/quake-1.jpg",
    width: 1204,
    height: 1600,
    alt: {
      en: "The rubble of a collapsed building spilling into the street, with people standing on top of it and a car crushed beneath a fallen concrete slab. An undamaged apartment block stands behind.",
      es: "Los escombros de un edificio colapsado sobre la calle, con personas paradas encima y un carro aplastado bajo una losa de concreto caída. Detrás queda en pie un bloque de apartamentos intacto.",
    },
  },
  {
    src: "/photos/quake-3.jpg",
    width: 1204,
    height: 1600,
    alt: {
      en: "People searching the rubble of a collapsed building. A mattress and broken furniture lie among the concrete and twisted reinforcing bar.",
      es: "Personas buscando entre los escombros de un edificio colapsado. Un colchón y muebles rotos quedaron entre el concreto y las varillas retorcidas.",
    },
  },
  {
    src: "/photos/quake-5.jpg",
    width: 1204,
    height: 1600,
    alt: {
      en: "A shop front sheared open by the quake, its upper floors exposed to the street with stock still on the shelves. Broken glass and caution tape cover the pavement.",
      es: "La fachada de un local arrancada por el sismo, con los pisos superiores abiertos a la calle y la mercancía todavía en los estantes. Vidrios rotos y cinta de precaución cubren el andén.",
    },
  },
  {
    src: "/photos/quake-2.jpg",
    width: 1204,
    height: 1600,
    alt: {
      en: "The facade of a white apartment building split by deep structural cracks running floor to floor, photographed from a passing vehicle.",
      es: "La fachada de un edificio blanco de apartamentos partida por grietas estructurales profundas que recorren piso por piso, fotografiada desde un vehículo en movimiento.",
    },
  },
  {
    src: "/photos/quake-4.jpg",
    width: 1204,
    height: 1600,
    alt: {
      en: "A brick building with one corner collapsed, its corrugated metal roof buckled down onto the street below.",
      es: "Un edificio de ladrillo con una esquina colapsada y su techo de zinc doblado sobre la calle.",
    },
  },
  {
    src: "/photos/quake-6.jpg",
    width: 1204,
    height: 1600,
    alt: {
      en: "A street strewn with fallen power lines and a toppled utility pole, beside a building that has collapsed onto the pavement.",
      es: "Una calle cubierta de cables de energía caídos y un poste derribado, junto a un edificio que se desplomó sobre el andén.",
    },
  },
];
