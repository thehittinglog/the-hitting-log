document.addEventListener("DOMContentLoaded", () => {
  const billingButton = document.getElementById("upgrade-button");
  const planButtons = Array.from(document.querySelectorAll("[data-plan-action]"));
  const planCards = Array.from(document.querySelectorAll("[data-membership-card]"));
  const planValue = document.getElementById("account-plan-value");
  const gameAccessValue = document.getElementById("account-game-access-value");
  const subscriptionValue = document.getElementById("account-subscription-value");
  const billingValue = document.getElementById("account-billing-value");
  const billingCopy = document.getElementById("billing-section-copy");
  const billingMessage = document.getElementById("billing-message");
  const checkoutResult = new URLSearchParams(window.location.search).get("checkout");
  const billingReturn = new URLSearchParams(window.location.search).get("billing") === "return";

  if (!billingButton) {
    return;
  }

  let currentPlan = "free";
  let planChangesUsePortal = false;
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
      ["free", "pro", "pro_plus"].includes(billingState.plan) &&
      typeof billingState.status === "string" &&
      Object.prototype.hasOwnProperty.call(billingState, "subscription") &&
      (billingState.subscription === null || typeof billingState.subscription === "object")
    );
  }

  function renderBillingState(billingState) {
    const normalizedState = window.hittingLogMembership?.normalizeState(billingState) || billingState;
    currentPlan = normalizedState?.plan || "free";
    const isPaid = currentPlan === "pro" || currentPlan === "pro_plus";
    const hasStripeCustomer = normalizedState?.subscription?.hasStripeCustomer === true;
    planChangesUsePortal = isPaid || new Set(["past_due", "unpaid", "paused", "incomplete"]).has(normalizedState?.status);
    const planLabel = typeof normalizedState?.displayName === "string"
      ? normalizedState.displayName
      : currentPlan === "pro_plus" ? "Pro Plus" : currentPlan === "pro" ? "Pro" : "Free";

    if (planValue) {
      planValue.textContent = planLabel;
    }
    if (gameAccessValue) {
      gameAccessValue.textContent = isPaid ? "Unlimited Games" : "10 Games Included";
    }
    if (subscriptionValue) {
      subscriptionValue.textContent = formatStatus(normalizedState?.status);
    }
    if (billingValue) {
      billingValue.textContent = hasStripeCustomer ? "Stripe Connected" : "Not Connected";
    }
    if (billingCopy) {
      const periodEnd = normalizedState?.currentPeriodEnd
        ? new Date(normalizedState.currentPeriodEnd).toLocaleDateString()
        : "the end of the current billing period";

      if (isPaid && normalizedState?.cancelAtPeriodEnd) {
        billingCopy.textContent = `${planLabel} remains active until ${periodEnd}, then your account returns to Free.`;
      } else if (isPaid) {
        billingCopy.textContent = `${planLabel} is active. Manage plan changes, payment methods, invoices, and cancellation through Stripe.`;
      } else if (planChangesUsePortal) {
        billingCopy.textContent = `Your subscription is ${formatStatus(normalizedState?.status).toLowerCase()}. Open Stripe to resolve billing or change plans.`;
      } else {
        billingCopy.textContent = "Choose Pro for unlimited games and analytics, or Pro Plus to add the AI Hitting Assistant.";
      }
    }

    planCards.forEach((card) => {
      const cardPlan = card.dataset.membershipCard;
      const isCurrent = cardPlan === currentPlan;
      card.classList.toggle("is-current", isCurrent);
      const label = card.querySelector("[data-current-plan-label]");
      if (label) label.hidden = !isCurrent;
    });

    planButtons.forEach((button) => {
      const targetPlan = button.dataset.planAction;
      const isCurrent = targetPlan === currentPlan;
      button.hidden = isCurrent;
      button.disabled = isCurrent;

      if (!isCurrent) {
        button.textContent = planChangesUsePortal
          ? "Manage in Stripe"
          : currentPlan === "free"
          ? `Upgrade to ${targetPlan === "pro_plus" ? "Pro Plus" : "Pro"}`
          : targetPlan === "pro_plus"
            ? "Upgrade in Stripe"
            : "Change Plan in Stripe";
        button.disabled = false;
      }
    });

    billingButton.hidden = !hasStripeCustomer;
    billingButton.textContent = "Manage Billing";
    billingButton.disabled = !hasStripeCustomer;
  }

  async function loadBillingState(attempt = 0) {
    try {
      const session = await getAuthenticatedSession();

      if (!session) {
        return;
      }

      console.info("Subscription status authenticated user ID:", session.user?.id || "unavailable");
      console.info("Subscription status requested API endpoint:", subscriptionStatusEndpoint);

      // Account is the explicit billing surface, so one authoritative Stripe
      // reconciliation per account-page load is appropriate and repairs users
      // whose webhook was missed even when they did not just return from Stripe.
      const endpoint = `${subscriptionStatusEndpoint}?reconcile=1`;
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store",
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

      if (checkoutResult === "success" && data.plan === "free" && attempt < 4) {
        setMessage("Finalizing your Stripe subscription...");
        window.setTimeout(() => loadBillingState(attempt + 1), 1500);
        return;
      }

      if (billingReturn && attempt < 2) {
        setMessage("Refreshing your Stripe membership...");
        window.setTimeout(() => loadBillingState(attempt + 1), 1500);
        return;
      }

      renderBillingState(data);

      if (data.reconciliationPending) {
        setMessage("Your saved membership is shown. Stripe synchronization is temporarily unavailable.");
      } else if (checkoutResult === "success" && data.plan !== "free") {
        setMessage(`Your ${data.plan === "pro_plus" ? "Pro Plus" : "Pro"} subscription is active.`);
      } else if (billingReturn) {
        setMessage(`Your ${data.plan === "pro_plus" ? "Pro Plus" : data.plan === "pro" ? "Pro" : "Free"} membership is up to date.`);
      } else if (checkoutResult === "success") {
        setMessage("Your subscription is still syncing. Refresh this page in a moment.");
      } else if (checkoutResult === "cancelled") {
        setMessage("Checkout was cancelled. You have not been charged.");
      } else if (!data.subscription?.hasStripeCustomer) {
        setMessage("You’re currently on the Free plan.");
      }
    } catch (error) {
      console.error("Unable to load subscription status:", error);
      renderBillingState({ plan: "free", status: "inactive", subscription: null });
      setMessage("Your subscription status could not be verified. Please try again.", true);
    }
  }

  async function openBilling(button, targetPlan = null) {
    const originalText = button.textContent;

    try {
      button.disabled = true;
      const usesPortal = planChangesUsePortal || !targetPlan;
      button.textContent = usesPortal ? "Opening billing..." : "Opening checkout...";
      setMessage("");

      const session = await getAuthenticatedSession();

      if (!session) {
        return;
      }

      const endpoint = usesPortal ? "/api/create-portal-session" : "/api/create-checkout-session";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(targetPlan ? { plan: targetPlan } : {}),
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
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  billingButton.addEventListener("click", () => openBilling(billingButton));
  planButtons.forEach((button) => {
    button.addEventListener("click", () => openBilling(button, button.dataset.planAction));
  });

  loadBillingState();
});
