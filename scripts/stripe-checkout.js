document.addEventListener("DOMContentLoaded", () => {
  const billingButton = document.getElementById("upgrade-button");
  const planValue = document.getElementById("account-plan-value");
  const subscriptionValue = document.getElementById("account-subscription-value");
  const billingValue = document.getElementById("account-billing-value");
  const billingCopy = document.getElementById("billing-section-copy");
  const billingMessage = document.getElementById("billing-message");
  const checkoutResult = new URLSearchParams(window.location.search).get("checkout");

  if (!billingButton) {
    return;
  }

  let billingMode = "checkout";

  function setMessage(message, isError = false) {
    if (!billingMessage) {
      return;
    }

    billingMessage.textContent = message;
    billingMessage.classList.toggle("is-error", isError);
  }

  function formatStatus(status) {
    if (!status) {
      return "Inactive";
    }

    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  async function getAuthenticatedSession() {
    if (!window.hittingLogAuth) {
      throw new Error("Authentication is not available.");
    }

    const { data, error } = await window.hittingLogAuth.getCurrentSession();

    if (error) {
      throw error;
    }

    if (!data?.session?.access_token) {
      window.location.href = "/login";
      return null;
    }

    return data.session;
  }

  function renderBillingState(subscription) {
    const isPro = subscription?.plan === "pro";
    billingMode = isPro ? "portal" : "checkout";

    if (planValue) {
      planValue.textContent = isPro ? "Pro" : "Free";
    }
    if (subscriptionValue) {
      subscriptionValue.textContent = formatStatus(subscription?.subscription_status);
    }
    if (billingValue) {
      billingValue.textContent = subscription?.stripe_customer_id ? "Stripe Connected" : "Not Connected";
    }
    if (billingCopy) {
      billingCopy.textContent = isPro
        ? "Manage your payment method, invoices, and subscription through Stripe."
        : "Upgrade to Pro for unlimited games and advanced hitting analytics.";
    }

    billingButton.textContent = isPro ? "Manage Billing" : "Upgrade to Pro";
    billingButton.disabled = false;
  }

  async function loadBillingState(attempt = 0) {
    try {
      const session = await getAuthenticatedSession();

      if (!session) {
        return;
      }

      const client = await window.hittingLogSupabaseReady;

      if (!client) {
        throw new Error("Subscription data is unavailable.");
      }

      const { data, error } = await client
        .from("subscriptions")
        .select("stripe_customer_id,subscription_status,plan")
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (checkoutResult === "success" && data?.plan !== "pro" && attempt < 4) {
        setMessage("Finalizing your Stripe subscription...");
        window.setTimeout(() => loadBillingState(attempt + 1), 1500);
        return;
      }

      renderBillingState(data);

      if (checkoutResult === "success" && data?.plan === "pro") {
        setMessage("Your Pro subscription is active.");
      } else if (checkoutResult === "success") {
        setMessage("Your subscription is still syncing. Refresh this page in a moment.");
      } else if (checkoutResult === "cancelled") {
        setMessage("Checkout was cancelled. You have not been charged.");
      }
    } catch (error) {
      console.error("Unable to load subscription status:", error);
      renderBillingState(null);
      setMessage("Subscription details could not be loaded. You can still try again or upgrade.", true);
    }
  }

  billingButton.addEventListener("click", async () => {
    const originalText = billingButton.textContent;

    try {
      billingButton.disabled = true;
      billingButton.textContent = billingMode === "portal" ? "Opening billing..." : "Opening checkout...";
      setMessage("");

      const session = await getAuthenticatedSession();

      if (!session) {
        return;
      }

      const endpoint =
        billingMode === "portal"
          ? "/api/create-portal-session"
          : "/api/create-checkout-session";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to open Stripe billing.");
      }

      if (!result.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.href = result.url;
    } catch (error) {
      console.error("Unable to open Stripe billing:", error);
      setMessage(error.message || "Something went wrong while opening Stripe billing.", true);
      billingButton.disabled = false;
      billingButton.textContent = originalText;
    }
  });

  loadBillingState();
});
