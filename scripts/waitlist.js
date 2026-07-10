(function () {
  const waitlistForms = document.querySelectorAll("[data-waitlist-form]");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const allowedSports = new Set(["baseball", "softball"]);
  const successMessage = "You're on the list! We'll let you know as soon as The Hitting Log is ready.";
  const duplicateMessage = "You're already on the waitlist.";

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

    button.disabled = isSubmitting;
    button.classList.toggle("is-loading", isSubmitting);
    button.setAttribute("aria-busy", String(isSubmitting));
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
        form.reset();
        resetSportSelection(form);
        setFormMessage(form, successMessage, "success");
      } catch (error) {
        if (isDuplicateError(error)) {
          setFormMessage(form, duplicateMessage, "info");
          return;
        }

        setFormMessage(form, "Something went wrong. Please try again in a moment.", "error");
      } finally {
        setSubmitting(form, false);
      }
    });
  });
})();
