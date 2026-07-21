document.addEventListener("DOMContentLoaded", () => {
  const upgradeButton = document.getElementById("upgrade-button");

  if (!upgradeButton) {
    return;
  }

  upgradeButton.addEventListener("click", async () => {
    const originalText = upgradeButton.textContent;

    try {
      upgradeButton.disabled = true;
      upgradeButton.textContent = "Opening checkout...";

      if (!window.hittingLogAuth) {
        throw new Error("Authentication is not available.");
      }

      const { data, error } =
        await window.hittingLogAuth.getCurrentSession();

      if (error) {
        throw error;
      }

      const accessToken = data?.session?.access_token;

      if (!accessToken) {
        window.location.href = "login.html";
        return;
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to open checkout.");
      }

      if (!result.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.href = result.url;
    } catch (error) {
      console.error(error);
      alert(error.message || "Something went wrong while opening checkout.");
      upgradeButton.disabled = false;
      upgradeButton.textContent = originalText;
    }
  });
});
