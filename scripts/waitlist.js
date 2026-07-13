(function () {
  const waitlistForms = document.querySelectorAll("[data-waitlist-form]");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const allowedSports = new Set(["baseball", "softball"]);
  const successMessage = "You're officially on the waitlist! Check your email.";
  const duplicateMessage = "You're already on the waitlist! Keep an eye on your inbox for updates.";
  const emailFailureMessage = "You're on the waitlist, but we couldn't send your confirmation email.";

  function setFormMessage(form, message, type) {
    const messageNode = form.querySelector(".waitlist-message");

    if (!messageNode) {
      return;
    }

    messageNode.textContent = message;
    messageNode.dataset.status = type || "";
  }

  function setSubmitting(form, isSubmitting) {
    const button = form.querySelector(".waitlist-submit-button");

    if (!button) {
      return;
    }

    const submitText = button.querySelector(".waitlist-submit-text");

    if (submitText && !submitText.dataset.defaultText) {
      submitText.dataset.defaultText = submitText.textContent;
    }

    button.disabled = isSubmitting;
    button.classList.toggle("is-loading", isSubmitting);
    button.setAttribute("aria-busy", String(isSubmitting));

    if (submitText) {
      submitText.textContent = isSubmitting ? "Joining..." : submitText.dataset.defaultText;
    }
  }

  function getPayload(form) {
    const formData = new FormData(form);
    const firstName = String(formData.get("firstName") || "").trim();
    const lastName = String(formData.get("lastName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const sport = String(formData.get("sport") || "").trim().toLowerCase();

    return {
      firstName,
      lastName,
      email,
      sport,
    };
  }

  function validatePayload(payload) {
    if (!payload.firstName || !payload.lastName || !payload.email || !payload.sport) {
      return "Please complete every field.";
    }

    if (!emailPattern.test(payload.email)) {
      return "Please enter a valid email address.";
    }

    if (!allowedSports.has(payload.sport)) {
      return "Please choose Baseball or Softball.";
    }

    return "";
  }

  async function submitWaitlist(payload) {
    await window.hittingLogSupabaseReady;

    const client = window.hittingLogSupabase?.getClient();

    if (!client) {
      throw new Error("Supabase waitlist is not configured yet.");
    }

    const { error } = await client.from("waitlist").insert({
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      sport: payload.sport,
    });

    if (error) {
      throw error;
    }
  }

  async function sendWaitlistEmail(payload) {
    const response = await fetch("/api/send-waitlist-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: payload.firstName,
        email: payload.email,
      }),
    });

    let result = {};

    try {
      result = await response.json();
    } catch (error) {
      result = {};
    }

    if (!response.ok || result.success !== true) {
      throw new Error(result.error || "Unable to send confirmation email.");
    }
  }

  function isDuplicateError(error) {
    return error?.code === "23505" || /duplicate key|already exists/i.test(error?.message || "");
  }

  function resetSportSelection(form) {
    form.querySelectorAll("input[name='sport']").forEach((input) => {
      input.checked = false;
    });
  }

  waitlistForms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = getPayload(form);
      const validationMessage = validatePayload(payload);

      if (validationMessage) {
        setFormMessage(form, validationMessage, "error");
        return;
      }

      setSubmitting(form, true);
      setFormMessage(form, "", "");

      try {
        await submitWaitlist(payload);
        try {
          await sendWaitlistEmail(payload);
        } catch (emailError) {
          form.reset();
          resetSportSelection(form);
          setFormMessage(form, emailFailureMessage, "error");
          return;
        }
        form.reset();
        resetSportSelection(form);
        setFormMessage(form, successMessage, "success");
      } catch (error) {
        if (isDuplicateError(error)) {
          setFormMessage(form, duplicateMessage, "info");
          return;
        }

        console.error("Waitlist submission error:", error);
        setFormMessage(
          form,
          `Something went wrong: ${error?.message || "Unknown error"}`,
          "error"
        );
      } finally {
        setSubmitting(form, false);
      }
    });
  });
})();
