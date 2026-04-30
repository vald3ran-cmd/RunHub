/**
 * Entry-point neutro per TypeScript e fallback Metro.
 *
 * A runtime Metro risolve automaticamente verso:
 *   - revenuecat.native.ts  (iOS + Android)
 *   - revenuecat.web.ts     (web)
 * grazie alle platform extensions. Questo file serve solo per far capire a
 * TypeScript il modulo `../src/revenuecat` (altrimenti il compiler non lo
 * trova perche' non c'e' un file senza estensione platform).
 *
 * NB: esportiamo dalla versione native perche' e' quella piu' completa in
 * termini di tipi; Metro comunque sovrascrive l'implementazione su web.
 */
export * from './revenuecat.native';
