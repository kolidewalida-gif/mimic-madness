// Vitest global setup
// Loaded by vitest.config.ts → test.setupFiles
// Adds @testing-library/jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...)
// for component-rendering tests planned in tasks 15.3 / 16.2 / 19.1.
import "@testing-library/jest-dom/vitest";

/**
 * jsdom n'implémente pas `Blob.prototype.arrayBuffer`, alors que tous les
 * navigateurs visés l'ont depuis 2019-2020. Sans ce complément, tout code qui
 * décode un enregistrement — assemblage des segments de voix, inversion audio,
 * suppression du silence de début — échoue en test pour une raison qui n'existe
 * pas en production.
 */
if (typeof Blob !== "undefined" && typeof Blob.prototype.arrayBuffer !== "function") {
  Object.defineProperty(Blob.prototype, "arrayBuffer", {
    configurable: true,
    writable: true,
    value(this: Blob): Promise<ArrayBuffer> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(this);
      });
    },
  });
}
