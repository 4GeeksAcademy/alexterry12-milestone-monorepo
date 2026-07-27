import type { Product, Shipment } from "../types/models";

export function findProductBySKU(
  products: Product[],
  sku: string,
): Product | null {
  const target = sku.toLowerCase();
  for (const product of products) {
    if (product.sku.toLowerCase() === target) {
      return product;
    }
  }
  return null;
}

export function findShipmentById(
  shipments: Shipment[],
  id: string,
): Shipment | null {
  for (const shipment of shipments) {
    if (shipment.id === id) {
      return shipment;
    }
  }
  return null;
}

// Requires pre-sorted input: `sortedProducts` must be sorted ascending by weightKg.
export function binarySearchProductByWeight(
  sortedProducts: Product[],
  targetWeight: number,
): number {
  let low = 0;
  let high = sortedProducts.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midWeight = sortedProducts[mid].weightKg;

    if (midWeight === targetWeight) {
      return mid;
    } else if (midWeight < targetWeight) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return -1;
}
