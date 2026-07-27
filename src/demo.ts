import type { Product, Carrier, Shipment } from "./types/models";
import {
  filterProductsByWarehouse,
  filterProductsByCategory,
  filterLowStockProducts,
  sortProductsByStock,
  sortCarriersByReliability,
} from "./utils/collections";
import {
  findProductBySKU,
  findShipmentById,
  binarySearchProductByWeight,
} from "./utils/search";
import {
  calculateShippingCost,
  scoreCarrierForShipment,
  selectBestCarrier,
  countProductsByCategory,
  calculateTotalInventoryValue,
  calculateAverageShipmentDistance,
  groupShipmentsByStatus,
  findTopCarriers,
} from "./utils/transformations";
import {
  validateProduct,
  validateShipment,
  validateCarrier,
} from "./utils/validations";

const sampleProducts: Product[] = [
  {
    sku: "SHOE-BLK-42",
    name: "Black Running Shoes - Size 42",
    category: "Fashion",
    weightKg: 0.8,
    dimensions: { lengthCm: 35, widthCm: 22, heightCm: 12 },
    warehouse: "Los Angeles",
    stockQuantity: 45,
    minStockThreshold: 20,
    unitCostUSD: 35.0,
    isFragile: false,
    status: "Active",
  },
  {
    sku: "LAPTOP-DELL-15",
    name: "Dell Laptop 15 inch",
    category: "Electronics",
    weightKg: 2.3,
    dimensions: { lengthCm: 40, widthCm: 28, heightCm: 3 },
    warehouse: "Zaragoza",
    stockQuantity: 8,
    minStockThreshold: 10,
    unitCostUSD: 650.0,
    isFragile: true,
    status: "Low stock",
  },
  {
    sku: "PERFUME-COCO-50",
    name: "Coco Perfume 50ml",
    category: "Cosmetics",
    weightKg: 0.3,
    dimensions: { lengthCm: 12, widthCm: 8, heightCm: 15 },
    warehouse: "Los Angeles",
    stockQuantity: 120,
    minStockThreshold: 30,
    unitCostUSD: 85.0,
    isFragile: true,
    status: "Active",
  },
];

const sampleCarriers: Carrier[] = [
  {
    id: "CAR-UPS",
    name: "UPS",
    operatesIn: ["United States"],
    baseRateUSD: 5.0,
    ratePerKgUSD: 1.2,
    ratePerKmUSD: 0.05,
    avgDeliveryDays: 3,
    onTimeRate: 88,
    maxWeightKg: 30,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express"],
  },
  {
    id: "CAR-SEUR",
    name: "SEUR",
    operatesIn: ["Spain"],
    baseRateUSD: 6.5,
    ratePerKgUSD: 1.5,
    ratePerKmUSD: 0.08,
    avgDeliveryDays: 2,
    onTimeRate: 92,
    maxWeightKg: 25,
    handlesFragile: true,
    acceptsPriority: ["Standard", "Express", "Same-day"],
  },
  {
    id: "CAR-DHL",
    name: "DHL Express",
    operatesIn: ["United States", "Spain"],
    baseRateUSD: 12.0,
    ratePerKgUSD: 2.0,
    ratePerKmUSD: 0.1,
    avgDeliveryDays: 1,
    onTimeRate: 95,
    maxWeightKg: 50,
    handlesFragile: true,
    acceptsPriority: ["Express", "Same-day"],
  },
];

const sampleShipment: Shipment = {
  id: "SH-2024-8821",
  sku: "LAPTOP-DELL-15",
  quantity: 1,
  origin: "Zaragoza",
  destination: {
    city: "Madrid",
    country: "Spain",
    postalCode: "28001",
    distanceKm: 320,
  },
  priority: "Express",
  declaredValueUSD: 650.0,
  carrier: null,
  status: "Pending",
  createdAt: new Date("2024-03-15"),
};

// Extra shipments so the array-based functions have richer data to work with.
const sampleShipments: Shipment[] = [
  sampleShipment,
  {
    id: "SH-2024-8822",
    sku: "SHOE-BLK-42",
    quantity: 2,
    origin: "Los Angeles",
    destination: {
      city: "San Diego",
      country: "United States",
      postalCode: "92101",
      distanceKm: 180,
    },
    priority: "Standard",
    declaredValueUSD: 70.0,
    carrier: "UPS",
    status: "Delivered",
    createdAt: new Date("2024-03-16"),
  },
  {
    id: "SH-2024-8823",
    sku: "PERFUME-COCO-50",
    quantity: 1,
    origin: "Los Angeles",
    destination: {
      city: "Phoenix",
      country: "United States",
      postalCode: "85001",
      distanceKm: 600,
    },
    priority: "Same-day",
    declaredValueUSD: 85.0,
    carrier: "DHL Express",
    status: "In transit",
    createdAt: new Date("2024-03-17"),
  },
  {
    id: "SH-2024-8824",
    sku: "LAPTOP-DELL-15",
    quantity: 1,
    origin: "Zaragoza",
    destination: {
      city: "Barcelona",
      country: "Spain",
      postalCode: "08001",
      distanceKm: 300,
    },
    priority: "Express",
    declaredValueUSD: 650.0,
    carrier: "UPS",
    status: "Assigned",
    createdAt: new Date("2024-03-18"),
  },
];

const laptopProduct = sampleProducts[1];

console.log("========== collections.ts ==========");
console.log(
  "filterProductsByWarehouse('Los Angeles'):",
  filterProductsByWarehouse(sampleProducts, "Los Angeles"),
);
console.log(
  "filterProductsByCategory('Electronics'):",
  filterProductsByCategory(sampleProducts, "Electronics"),
);
console.log(
  "filterLowStockProducts():",
  filterLowStockProducts(sampleProducts),
);
console.log(
  "sortProductsByStock('asc'):",
  sortProductsByStock(sampleProducts, "asc"),
);
console.log(
  "sortProductsByStock('desc'):",
  sortProductsByStock(sampleProducts, "desc"),
);
console.log(
  "sortCarriersByReliability('desc'):",
  sortCarriersByReliability(sampleCarriers, "desc"),
);

console.log("\n========== search.ts ==========");
console.log(
  "findProductBySKU('shoe-blk-42') [case-insensitive]:",
  findProductBySKU(sampleProducts, "shoe-blk-42"),
);
console.log(
  "findProductBySKU('DOES-NOT-EXIST'):",
  findProductBySKU(sampleProducts, "DOES-NOT-EXIST"),
);
console.log(
  "findShipmentById('SH-2024-8821'):",
  findShipmentById(sampleShipments, "SH-2024-8821"),
);
console.log(
  "findShipmentById('NOPE'):",
  findShipmentById(sampleShipments, "NOPE"),
);

const sortedByWeight = [...sampleProducts].sort(
  (a, b) => a.weightKg - b.weightKg,
);
console.log(
  "sortedByWeight (ascending) SKUs:",
  sortedByWeight.map((p) => `${p.sku} (${p.weightKg}kg)`),
);
console.log(
  "binarySearchProductByWeight(0.8):",
  binarySearchProductByWeight(sortedByWeight, 0.8),
);
console.log(
  "binarySearchProductByWeight(99):",
  binarySearchProductByWeight(sortedByWeight, 99),
);

console.log("\n========== transformations.ts ==========");
console.log(
  "calculateShippingCost(shipment, laptop, DHL):",
  calculateShippingCost(sampleShipment, laptopProduct, sampleCarriers[2]),
);
console.log(
  "scoreCarrierForShipment(DHL, shipment, laptop):",
  scoreCarrierForShipment(sampleCarriers[2], sampleShipment, laptopProduct),
);
console.log(
  "selectBestCarrier(carriers, shipment, laptop):",
  selectBestCarrier(sampleCarriers, sampleShipment, laptopProduct),
);
console.log(
  "countProductsByCategory():",
  countProductsByCategory(sampleProducts),
);
console.log(
  "calculateTotalInventoryValue():",
  calculateTotalInventoryValue(sampleProducts),
);
console.log(
  "calculateAverageShipmentDistance():",
  calculateAverageShipmentDistance(sampleShipments),
);
console.log(
  "groupShipmentsByStatus():",
  groupShipmentsByStatus(sampleShipments),
);
console.log("findTopCarriers(topN=2):", findTopCarriers(sampleShipments, 2));

console.log("\n========== validations.ts ==========");
console.log(
  "validateProduct(valid product):",
  validateProduct(sampleProducts[0]),
);

const invalidProduct: Product = {
  sku: "",
  name: "Broken Item",
  category: "Other",
  weightKg: 0,
  dimensions: { lengthCm: 0, widthCm: 250, heightCm: -5 },
  warehouse: "Los Angeles",
  stockQuantity: -1,
  minStockThreshold: -2,
  unitCostUSD: 0,
  isFragile: false,
  status: "Active",
};
console.log(
  "validateProduct(invalid product):",
  validateProduct(invalidProduct),
);

console.log(
  "validateShipment(valid shipment):",
  validateShipment(sampleShipment),
);

const invalidShipment: Shipment = {
  id: "SH-BAD",
  sku: "SHOE-BLK-42",
  quantity: 0,
  origin: "Los Angeles",
  destination: {
    city: "Nowhere",
    country: "United States",
    postalCode: "00000",
    distanceKm: -10,
  },
  priority: "Standard",
  declaredValueUSD: 0,
  carrier: null,
  status: "Pending",
  createdAt: new Date("2024-03-15"),
};
console.log(
  "validateShipment(invalid shipment):",
  validateShipment(invalidShipment),
);

console.log("validateCarrier(valid carrier):", validateCarrier(sampleCarriers[0]));

const invalidCarrier: Carrier = {
  id: "CAR-BAD",
  name: "Broken Carrier",
  operatesIn: [],
  baseRateUSD: -1,
  ratePerKgUSD: -1,
  ratePerKmUSD: -1,
  avgDeliveryDays: 0,
  onTimeRate: 150,
  maxWeightKg: 0,
  handlesFragile: false,
  acceptsPriority: ["Standard"],
};
console.log(
  "validateCarrier(invalid carrier):",
  validateCarrier(invalidCarrier),
);
