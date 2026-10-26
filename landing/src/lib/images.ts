const unsplash = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

export const images = {
  hero: unsplash("photo-1517248135467-4c7edcad34c4", 2200),
  story: unsplash("photo-1590846406792-0adc7f938f1d", 1400),
  dishFire: unsplash("photo-1504674900247-0877df9cc836", 900),
  dishSea: unsplash("photo-1476224203421-9ac39bcb3327", 900),
  dishSweet: unsplash("photo-1551024506-0bccd828d307", 900),
  hotel: unsplash("photo-1611892440504-42a792e24d32", 1400),
  galleryTable: unsplash("photo-1414235077428-338989a2e8c0", 1000),
  galleryWine: unsplash("photo-1510812431401-41d2bd2722f3", 1000),
  galleryChef: unsplash("photo-1577219491135-ce391730fb2c", 1000),
  galleryBar: unsplash("photo-1543007630-9710e4a00a20", 1000),
} as const;
