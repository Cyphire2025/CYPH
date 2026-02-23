import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE, apiFetch } from "../lib/fetch";

const PLAN_PRICES = Object.freeze({
  free: 0,
  plus: 499,
  ultra: 1499,
});

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const requestedPlan = String(new URLSearchParams(location.search).get("plan") || "free").toLowerCase();
  const selectedPlan = useMemo(
    () => (Object.prototype.hasOwnProperty.call(PLAN_PRICES, requestedPlan) ? requestedPlan : "free"),
    [requestedPlan]
  );
  const amount = PLAN_PRICES[selectedPlan];

  const activateFreePlan = async () => {
    const response = await apiFetch(`${API_BASE}/api/users/me/plan`, {
      method: "PATCH",
      body: JSON.stringify({ plan: "free" }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Failed to activate free plan");
    }
  };

  const activatePaidPlan = async () => {
    if (!window.Razorpay) {
      throw new Error("Payment checkout is unavailable right now");
    }

    const keyResponse = await apiFetch(`${API_BASE}/api/payment/public-key`, {
      method: "GET",
    });
    const keyPayload = await keyResponse.json().catch(() => ({}));
    if (!keyResponse.ok || !keyPayload?.keyId) {
      throw new Error(keyPayload?.error || "Payment is temporarily unavailable");
    }

    const orderResponse = await apiFetch(`${API_BASE}/api/payment/create-plan-order`, {
      method: "POST",
      body: JSON.stringify({ plan: selectedPlan }),
    });
    const orderPayload = await orderResponse.json().catch(() => ({}));
    if (!orderResponse.ok || !orderPayload?.id) {
      throw new Error(orderPayload?.error || "Failed to start checkout");
    }

    await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: keyPayload.keyId,
        amount: orderPayload.amount,
        currency: orderPayload.currency || "INR",
        name: "Cyphire",
        description: `${selectedPlan} plan subscription`,
        order_id: orderPayload.id,
        theme: { color: "#5A67D8" },
        modal: {
          ondismiss: () => reject(new Error("Payment was cancelled")),
        },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await apiFetch(`${API_BASE}/api/payment/verify-plan-payment`, {
              method: "POST",
              body: JSON.stringify({
                plan: selectedPlan,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });
            const verifyPayload = await verifyResponse.json().catch(() => ({}));
            if (!verifyResponse.ok || !verifyPayload?.success) {
              throw new Error(verifyPayload?.error || "Payment verification failed");
            }
            resolve();
          } catch (err) {
            reject(err);
          }
        },
      });

      checkout.on("payment.failed", (event) => {
        reject(new Error(event?.error?.description || "Payment failed"));
      });

      checkout.open();
    });
  };

  const handlePayment = async () => {
    setError("");
    setLoading(true);
    try {
      if (selectedPlan === "free") {
        await activateFreePlan();
      } else {
        await activatePaidPlan();
      }

      setSuccess(true);
      window.setTimeout(() => navigate("/home"), 2000);
    } catch (err) {
      const message =
        err instanceof Error && err.message ? err.message : "Checkout failed. Please try again.";
      setError(message);
      console.error("Checkout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0f] via-[#0c0c14] to-[#000] text-white px-4">
      {!success ? (
        <section className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
          <h1 className="text-3xl font-bold mb-4">Checkout</h1>
          <p className="mb-2">
            You selected the <b>{selectedPlan}</b> plan.
          </p>
          <p className="mb-6 text-sm text-white/75">
            {selectedPlan === "free" ? "No payment required." : `Amount: INR ${amount}`}
          </p>

          {error ? (
            <p
              role="alert"
              aria-live="assertive"
              className="mb-4 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            aria-busy={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? "Processing..."
              : selectedPlan === "free"
                ? "Activate Free Plan"
                : `Pay INR ${amount} & Activate`}
          </button>
        </section>
      ) : (
        <section role="status" aria-live="polite" className="text-center">
          <h2 className="text-2xl font-semibold text-green-400 mb-2">Payment successful</h2>
          <p>Your {selectedPlan} plan is now active.</p>
        </section>
      )}
    </div>
  );
}
