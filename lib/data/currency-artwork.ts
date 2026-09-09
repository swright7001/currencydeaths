export type CurrencyArtwork = Readonly<{
  src: string;
  label: string;
  credit: string;
  source: string;
  license: string;
  licenseUrl?: string;
  crop?: readonly [number, number, number, number];
}>;

export const currencyArtwork: Readonly<Record<string, CurrencyArtwork>> = {
  "german-papiermark": {
    src: "/images/currencies/german-papiermark.jpg",
    label: "100,000 Mark · 1923",
    credit: "National Numismatic Collection / Godot13",
    source: "https://commons.wikimedia.org/wiki/File:GER-83-Reichsbanknote-100000_Mark_(1923).jpg",
    license: "Public domain (Commons)",
    crop: [0.02, 0.018, 0.96, 0.472],
  },
  "hungarian-pengo": {
    src: "/images/currencies/hungarian-pengo.jpg",
    label: "100 million b.-pengő · 1946",
    credit: "Magyar Nemzeti Bank / Timur lenk",
    source: "https://commons.wikimedia.org/wiki/File:HUP_100MB_1946_obverse.jpg",
    license: "Public domain (Commons)",
  },
  "zimbabwe-dollar-1980": {
    src: "/images/currencies/zimbabwe-dollar-1980.jpg",
    label: "100 trillion dollars · 2009",
    credit: "Reserve Bank of Zimbabwe / Camp0s",
    source: "https://commons.wikimedia.org/wiki/File:Zimbabwe_$100_trillion_2009_Obverse.jpg",
    license: "Public domain (Commons)",
  },
  "venezuelan-bolivar-fuerte": {
    src: "/images/currencies/venezuelan-bolivar-fuerte.jpg",
    label: "100 bolívares fuertes · 2015",
    credit: "Banco Central de Venezuela / Keizers",
    source: "https://commons.wikimedia.org/wiki/File:VEF_100.jpg",
    license: "Public domain (Commons)",
    crop: [0.09, 0.03, 0.82, 0.965],
  },
  "greek-drachma": {
    src: "/images/currencies/greek-drachma.jpg",
    label: "2,000 million drachmas · 1944 note, earlier than euro adoption",
    credit: "historia / Gre regiment · Numismatic Museum of Athens",
    source: "https://commons.wikimedia.org/wiki/File:2,000_million_drachma,_1944,_Numismatic_Museum_of_Athens.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
};
