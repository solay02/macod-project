/**
 * Upsell Config — attach upsell offers to a product.
 *
 * Shows existing upsell offers + a form to add new ones.
 * Each offer: upsell product + discounted price + label.
 */

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface UpsellOffer {
  id: string;
  upsellProductId: string;
  upsellPrice: number;
  label: string | null;
  active: boolean;
  upsellProduct?: { id: string; name: string; price: number };
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface Props {
  productId: string;
}

export default function UpsellConfig({ productId }: Props) {
  const [offers, setOffers] = useState<UpsellOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProductId, setNewProductId] = useState("");
  const [newPrice, setNewPrice] = useState(0);
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [offersRes, productsRes] = await Promise.all([
          apiFetch<{ data: UpsellOffer[] }>(`/api/upsell/product/${productId}`),
          apiFetch<{ data: Product[] }>("/api/products?limit=100"),
        ]);
        setOffers(offersRes.data ?? []);
        setProducts(productsRes.data ?? []);
      } catch (err) {
        console.error("Failed to load:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  const addOffer = async () => {
    if (!newProductId || newPrice <= 0) return;
    try {
      await apiFetch("/api/upsell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          upsellProductId: newProductId,
          upsellPrice: newPrice,
          label: newLabel || null,
        }),
      });
      setNewProductId("");
      setNewPrice(0);
      setNewLabel("");
      // Refresh
      const res = await apiFetch<{ data: UpsellOffer[] }>(`/api/upsell/product/${productId}`);
      setOffers(res.data ?? []);
    } catch (err) {
      console.error("Failed to add upsell:", err);
    }
  };

  const toggleActive = async (offer: UpsellOffer) => {
    try {
      await apiFetch(`/api/upsell/${offer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !offer.active }),
      });
      setOffers((prev) => prev.map((o) => o.id === offer.id ? { ...o, active: !o.active } : o));
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  };

  const removeOffer = async (id: string) => {
    try {
      await apiFetch(`/api/upsell/${id}`, { method: "DELETE" });
      setOffers((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      console.error("Failed to remove:", err);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-black mb-4">Upsell Configuration</h1>
      <p className="text-sm text-gray-500 mb-4">
        Attach upsell offers shown on the thank-you page. "Before you go — add this for 99 DH!"
      </p>

      <div className="border rounded-xl p-4 mb-6 bg-white">
        <h2 className="font-bold mb-2">Add Upsell Offer</h2>
        <div className="space-y-2">
          <select
            value={newProductId}
            onChange={(e) => {
              setNewProductId(e.target.value);
              const p = products.find((p) => p.id === e.target.value);
              if (p) setNewPrice(p.price);
            }}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select a product...</option>
            {products.filter((p) => p.id !== productId).map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.price} درهم)</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Upsell price (درهم)"
            value={newPrice || ""}
            onChange={(e) => setNewPrice(parseInt(e.target.value, 10) || 0)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Label (optional) — e.g. 'قبل ما تخرج! خذ هذا المنتج بـ 99 درهم'"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <button
            onClick={addOffer}
            disabled={!newProductId || newPrice <= 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            Add Offer
          </button>
        </div>
      </div>

      <h2 className="font-bold mb-2">Active Offers</h2>
      {offers.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No upsell offers yet</div>
      ) : (
        <div className="space-y-2">
          {offers.map((offer) => (
            <div key={offer.id} className="border rounded-xl p-3 bg-white flex items-center gap-3">
              <div className="flex-1">
                <div className="font-bold">{offer.upsellProduct?.name ?? "Unknown product"}</div>
                <div className="text-sm text-gray-500">
                  {offer.upsellPrice} درهم
                  {offer.upsellProduct && offer.upsellProduct.price > offer.upsellPrice && (
                    <span className="line-through ms-2">{offer.upsellProduct.price}</span>
                  )}
                </div>
                {offer.label && <div className="text-xs mt-1">{offer.label}</div>}
              </div>
              <button
                onClick={() => toggleActive(offer)}
                className={`text-xs px-2 py-1 rounded ${offer.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
              >
                {offer.active ? "Active" : "Inactive"}
              </button>
              <button
                onClick={() => removeOffer(offer.id)}
                className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
