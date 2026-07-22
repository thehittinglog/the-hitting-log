(function () {
  const form = document.getElementById("support-form");

  if (!form) {
    return;
  }

  const submitButton = document.getElementById("support-submit-button");
  const formMessage = document.getElementById("support-form-message");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const successMessage = "Thanks! We've received your message and will get back to you as soon as possible.";
  const errorMessage = "We couldn't send your message. Please try again in a moment.";
  let isSubmitting = false;
  let submissionId = "";
  let submissionFingerprint = "";

  function setMessage(message, type = "") {
    formMessage.textContent = message;
    formMessage.classList.toggle("is-success", type === "success");
    formMessage.classList.toggle("is-error", type === "error");
  }

  function setSubmitting(submitting) {
    isSubmitting = submitting;
    submitButton.disabled = submitting;
    submitButton.setAttribute("aria-busy", String(submitting));
    submitButton.textContent = submitting ? "Sending..." : "Send Message";
  }

  function createSubmissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `support-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function getPayload() {
    const formData = new FormData(form);

    return {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim().toLowerCase(),
      subject: String(formData.get("subject") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      website: String(formData.get("website") || "").trim(),
    };
  }

  function validatePayload(payload) {
    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      return "Please complete every field.";
    }

    if (!emailPattern.test(payload.email)) {
      return "Please enter a valid email address.";
    }

    return "";
  }

  form.addEventListener("input", () => {
    const fingerprint = JSON.stringify(getPayload());

    if (submissionFingerprint && fingerprint !== submissionFingerprint) {
      submissionId = "";
      submissionFingerprint = "";
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const payload = getPayload();
    const validationMessage = validatePayload(payload);

    if (validationMessage) {
      setMessage(validationMessage, "error");
      return;
    }

    const fingerprint = JSON.stringify(payload);

    if (!submissionId || submissionFingerprint !== fingerprint) {
      submissionId = createSubmissionId();
      submissionFingerprint = fingerprint;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/send-support-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, submissionId }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success !== true) {
        throw new Error(result.error || "Unable to send support email.");
      }

      form.reset();
      submissionId = "";
      submissionFingerprint = "";
      setMessage(successMessage, "success");
    } catch (error) {
      console.error("Support form submission failed:", error.message);
      setMessage(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  });
})();
