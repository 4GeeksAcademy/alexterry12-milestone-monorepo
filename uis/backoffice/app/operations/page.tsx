import { filterLowStockProducts } from "@m2/utils/collections";
import {
  calculateTotalInventoryValue,
  countProductsByCategory,
  findTopCarriers,
  groupShipmentsByStatus,
  selectBestCarrier,
} from "@m2/utils/transformations";
import {
  sampleCarriers,
  sampleProducts,
  sampleShipment,
  sampleShipments,
} from "@/lib/sampleData";

function Section({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="font-mono text-xs text-muted">{source}</p>
      </div>
      {children}
    </section>
  );
}

export default function OperationsPage() {
  const lowStock = filterLowStockProducts(sampleProducts);
  const inventoryValue = calculateTotalInventoryValue(sampleProducts);
  const categoryCounts = countProductsByCategory(sampleProducts);
  const laptopProduct = sampleProducts[1];
  const bestCarrier = selectBestCarrier(
    sampleCarriers,
    sampleShipment,
    laptopProduct,
  );
  const byStatus = groupShipmentsByStatus(sampleShipments);
  const topCarriers = findTopCarriers(sampleShipments, 2);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-accent uppercase">
          Operations
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Milestone 2 business logic
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Results below are computed by importing functions from repo-root{" "}
          <span className="font-mono text-sm text-ink">src/</span> — not copied
          into this app.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Section
          title="Total inventory value"
          source="calculateTotalInventoryValue()"
        >
          <p className="font-mono text-3xl font-semibold text-accent">
            ${inventoryValue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="mt-2 text-sm text-muted">
            Across {sampleProducts.length} sample products
          </p>
        </Section>

        <Section
          title="Best carrier (SH-2024-8821)"
          source="selectBestCarrier()"
        >
          {bestCarrier ? (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Carrier</dt>
                <dd className="font-medium text-ink">
                  {bestCarrier.carrier.name}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Score</dt>
                <dd className="font-mono text-ink">{bestCarrier.score}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Cost</dt>
                <dd className="font-mono text-ink">
                  ${bestCarrier.cost.toFixed(2)}
                </dd>
              </div>
              <p className="pt-2 text-xs text-muted">
                Shipment: {sampleShipment.origin} →{" "}
                {sampleShipment.destination.city} ({laptopProduct.sku},{" "}
                {sampleShipment.priority})
              </p>
            </dl>
          ) : (
            <p className="text-sm text-muted">No eligible carrier (score &lt; 50).</p>
          )}
        </Section>
      </div>

      <Section title="Low stock products" source="filterLowStockProducts()">
        {lowStock.length === 0 ? (
          <p className="text-sm text-muted">No low-stock products.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-2 pr-4 font-medium">SKU</th>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Warehouse</th>
                  <th className="py-2 font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((product) => (
                  <tr key={product.sku} className="border-b border-line/70">
                    <td className="py-2 pr-4 font-mono text-xs">{product.sku}</td>
                    <td className="py-2 pr-4">{product.name}</td>
                    <td className="py-2 pr-4">{product.warehouse}</td>
                    <td className="py-2 font-mono">
                      {product.stockQuantity} / {product.minStockThreshold}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Products by category" source="countProductsByCategory()">
        <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {Object.entries(categoryCounts).map(([category, count]) => (
            <li
              key={category}
              className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm"
            >
              <span>{category}</span>
              <span className="font-mono font-medium text-ink">{count}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Shipments by status" source="groupShipmentsByStatus()">
        <ul className="space-y-3">
          {Object.entries(byStatus).map(([status, shipments]) => (
            <li key={status}>
              <p className="text-sm font-medium text-ink">
                {status}{" "}
                <span className="font-mono text-muted">({shipments.length})</span>
              </p>
              {shipments.length > 0 ? (
                <ul className="mt-1 space-y-1 pl-3 text-sm text-muted">
                  {shipments.map((shipment) => (
                    <li key={shipment.id} className="font-mono text-xs">
                      {shipment.id} · {shipment.sku} ·{" "}
                      {shipment.destination.city}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Top carriers" source="findTopCarriers(shipments, 2)">
        {topCarriers.length === 0 ? (
          <p className="text-sm text-muted">No assigned carriers.</p>
        ) : (
          <ol className="space-y-2">
            {topCarriers.map((entry, index) => (
              <li
                key={entry.carrier}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-mono text-muted">#{index + 1}</span>{" "}
                  {entry.carrier}
                </span>
                <span className="font-mono text-ink">
                  {entry.count} shipment{entry.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
