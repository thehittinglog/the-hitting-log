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
  const subscriptionStatusEndpoint = "/api/subscription-status";

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

  async function readApiResponse(response) {
    const responseText = await response.text();

    if (!responseText) {
      return {
        data: {},
        isJson: false,
        isEmpty: true,
      };
    }

    try {
      return {
        data: JSON.parse(responseText),
        isJson: true,
        isEmpty: false,
      };
    } catch (error) {
      console.error("Billing API returned a non-JSON response:", response.status, responseText.slice(0, 200));
      return {
        data: {
          error: `The billing service returned an invalid response (${response.status}). Please try again.`,
        },
        isJson: false,
        isEmpty: false,
      };
    }
  }

  async function readApiResult(response) {
    const result = await readApiResponse(response);
    return result.data;
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

  function isValidBillingState(billingState) {
    return Boolean(
      billingState &&
      (billingState.plan === "free" || billingState.plan === "pro") &&
      typeof billingState.status === "string" &&
      Object.prototype.hasOwnProperty.call(billingState, "subscription") &&
      (billingState.subscription === null || typeof billingState.subscription === "object")
    );
  }

  function renderBillingState(billingState) {
    const isPro = billingState?.plan === "pro";
    billingMode = isPro ? "portal" : "checkout";

    if (planValue) {
      planValue.textContent = isPro ? "Pro" : "Free";
    }
    if (subscriptionValue) {
      subscriptionValue.textContent = formatStatus(billingState?.status);
    }
    if (billingValue) {
      billingValue.textContent = billingState?.subscription?.hasStripeCustomer ? "Stripe Connected" : "Not Connected";
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

      console.info("Subscription status authenticated user ID:", session.user?.id || "unavailable");
      console.info("Subscription status requested API endpoint:", subscriptionStatusEndpoint);

      const response = await fetch(subscriptionStatusEndpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const apiResponse = await readApiResponse(response);
      const data = apiResponse.data;

      console.info("Subscription status HTTP status:", response.status);
      console.info("Subscription status final response body:", data);
      console.info("Subscription status response error code:", data.code || null);
      console.info("Subscription status response was JSON:", apiResponse.isJson);

      if (
        response.status === 401 &&
        (data.code === "missing_auth_token" || data.code === "invalid_auth_token")
      ) {
        setMessage(data.error || "Your login session has expired. Please sign in again.", true);
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Your subscription status could not be verified. Please try again.");
      }

      if (!isValidBillingState(data)) {
        throw new Error("Your subscription status could not be verified. Please try again.");
      }

      if (checkoutResult === "success" && data.plan !== "pro" && attempt < 4) {
        setMessage("Finalizing your Stripe subscription...");
        window.setTimeout(() => loadBillingState(attempt + 1), 1500);
        return;
      }

      renderBillingState(data);

      if (checkoutResult === "success" && data.plan === "pro") {
        setMessage("Your Pro subscription is active.");
      } else if (checkoutResult === "success") {
        setMessage("Your subscription is still syncing. Refresh this page in a moment.");
      } else if (checkoutResult === "cancelled") {
        setMessage("Checkout was cancelled. You have not been charged.");
      } else if (!data.subscription?.hasStripeCustomer) {
        setMessage("Online billing management is being connected. You can still upgrade using the button above.");
      }
    } catch (error) {
      console.error("Unable to load subscription status:", error);
      renderBillingState({ plan: "free", status: "inactive", subscription: null });
      setMessage("Your subscription status could not be verified. Please try again.", true);
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
        },
        body: JSON.stringify({}),
      });

      const result = await readApiResult(response);

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
