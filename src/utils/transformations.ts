import type {
  Carrier,
  Product,
  ProductCategory,
  Shipment,
  ShipmentStatus,
} from "../types/models";

const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Fashion",
  "Electronics",
  "Cosmetics",
  "Home",
  "Other",
];

const SHIPMENT_STATUSES: ShipmentStatus[] = [
  "Pending",
  "Assigned",
  "In transit",
  "Delivered",
  "Failed",
];

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

const PRIORITY_SURCHARGE: Record<Shipment["priority"], number> = {
  Standard: 0,
  Express: 0.3,
  "Same-day": 0.6,
};

export function calculateShippingCost(
  shipment: Shipment,
  product: Product,
  carrier: Carrier,
): number {
  const baseCost = carrier.baseRateUSD;
  const weightCost = product.weightKg * carrier.ratePerKgUSD * shipment.quantity;
  const distanceCost =
    shipment.destination.distanceKm * carrier.ratePerKmUSD;

  const subtotal = baseCost + weightCost + distanceCost;
  const total = subtotal * (1 + PRIORITY_SURCHARGE[shipment.priority]);

  return roundToTwoDecimals(total);
}

export function scoreCarrierForShipment(
  carrier: Carrier,
  shipment: Shipment,
  product: Product,
): number {
  let score = 0;

  if (carrier.operatesIn.includes(shipment.destination.country)) {
    score += 20;
  }

  if (product.weightKg * shipment.quantity <= carrier.maxWeightKg) {
    score += 20;
  }

  if (carrier.acceptsPriority.includes(shipment.priority)) {
    score += 15;
  }

  if (!product.isFragile || carrier.handlesFragile) {
    score += 15;
  }

  score += carrier.onTimeRate * 0.3;

  return roundToTwoDecimals(score);
}

export function selectBestCarrier(
  carriers: Carrier[],
  shipment: Shipment,
  product: Product,
): { carrier: Carrier; score: number; cost: number } | null {
  let best: { carrier: Carrier; score: number; cost: number } | null = null;

  for (const carrier of carriers) {
    const score = scoreCarrierForShipment(carrier, shipment, product);
    if (score < 50) {
      continue;
    }

    const cost = calculateShippingCost(shipment, product, carrier);
    if (best === null || cost < best.cost) {
      best = { carrier, score, cost };
    }
  }

  return best;
}

export function countProductsByCategory(
  products: Product[],
): Record<ProductCategory, number> {
  const counts = PRODUCT_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = 0;
      return acc;
    },
    {} as Record<ProductCategory, number>,
  );

  for (const product of products) {
    counts[product.category] += 1;
  }

  return counts;
}

export function calculateTotalInventoryValue(products: Product[]): number {
  const total = products.reduce(
    (sum, product) => sum + product.stockQuantity * product.unitCostUSD,
    0,
  );

  return roundToTwoDecimals(total);
}

export function calculateAverageShipmentDistance(
  shipments: Shipment[],
): number {
  if (shipments.length === 0) {
    return 0;
  }

  const total = shipments.reduce(
    (sum, shipment) => sum + shipment.destination.distanceKm,
    0,
  );

  return roundToTwoDecimals(total / shipments.length);
}

export function groupShipmentsByStatus(
  shipments: Shipment[],
): Record<ShipmentStatus, Shipment[]> {
  const groups = SHIPMENT_STATUSES.reduce(
    (acc, status) => {
      acc[status] = [];
      return acc;
    },
    {} as Record<ShipmentStatus, Shipment[]>,
  );

  for (const shipment of shipments) {
    groups[shipment.status].push(shipment);
  }

  return groups;
}

export function findTopCarriers(
  shipments: Shipment[],
  topN: number,
): Array<{ carrier: string; count: number }> {
  const counts = new Map<string, number>();

  for (const shipment of shipments) {
    if (shipment.carrier === null) {
      continue;
    }
    counts.set(shipment.carrier, (counts.get(shipment.carrier) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([carrier, count]) => ({ carrier, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}
