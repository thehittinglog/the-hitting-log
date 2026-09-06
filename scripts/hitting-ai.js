(function () {
  const STARTERS = [
    "What should I work on this week?",
    "What hurt my Performance Score?",
    "What am I doing well lately?",
    "What is causing most of my outs?",
    "What count am I hitting best in?",
    "What velocity gives me the most trouble?",
  ];
  const UPGRADE_MESSAGE = "AI Hitting Assistant is available with Pro Plus.";
  const messages = [];
  let isOpen = false;
  let isPro = null;
  let isSending = false;
  let panel;
  let overlay;
  let conversation;
  let form;
  let input;
  let sendButton;
  let athleteName;
  let accessButton;

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  async function getSession() {
    if (!window.hittingLogAuth?.getCurrentSession) return null;
    const { data, error } = await window.hittingLogAuth.getCurrentSession();
    if (error) throw error;
    return data?.session || null;
  }

  function setSending(value) {
    isSending = value;
    input.disabled = value || isPro !== true;
    sendButton.disabled = value || isPro !== true || !input.value.trim();
    sendButton.textContent = value ? "Thinking…" : "Send";
  }

  function appendMessage(role, content, options = {}) {
    const wrapper = createElement("div", `hitting-ai-message hitting-ai-message--${role}`);
    const bubble = createElement("div", "hitting-ai-message-bubble", content);
    if (options.error) bubble.classList.add("is-error");
    wrapper.appendChild(bubble);
    conversation.appendChild(wrapper);
    conversation.scrollTop = conversation.scrollHeight;
    return wrapper;
  }

  function renderStarters() {
    conversation.querySelector(".hitting-ai-starters")?.remove();
    if (messages.length || isPro !== true) return;
    const section = createElement("section", "hitting-ai-starters");
    section.appendChild(createElement("p", "hitting-ai-empty-copy", "Ask the AI Hitting Assistant about your performance."));
    section.appendChild(createElement("p", "hitting-ai-starter-label", "Try asking:"));
    STARTERS.forEach((question) => {
      const button = createElement("button", "hitting-ai-starter", question);
      button.type = "button";
      button.addEventListener("click", () => {
        input.value = question;
        sendButton.disabled = false;
        form.requestSubmit();
      });
      section.appendChild(button);
    });
    conversation.appendChild(section);
  }

  function renderUpgrade() {
    conversation.replaceChildren();
    const card = createElement("section", "hitting-ai-upgrade");
    const icon = createElement("span", "hitting-ai-upgrade-icon", "✦");
    icon.setAttribute("aria-hidden", "true");
    card.appendChild(icon);
    card.appendChild(createElement("h3", "", "Unlock AI Hitting Assistant"));
    card.appendChild(createElement("p", "", UPGRADE_MESSAGE));
    const link = createElement("a", "hitting-ai-upgrade-link", "Upgrade to Pro Plus");
    link.href = "/account";
    card.appendChild(link);
    conversation.appendChild(card);
    setSending(false);
  }

  function renderEligibilityGate(code, serverMessage = "", actionUrl = "") {
    isPro = false;
    conversation.replaceChildren();
    const card = createElement("section", "hitting-ai-upgrade");
    const icon = createElement("span", "hitting-ai-upgrade-icon", "✦");
    icon.setAttribute("aria-hidden", "true");
    const content = {
      date_of_birth_required: {
        title: "Add your date of birth to continue",
        copy: "We need your date of birth to confirm eligibility for Hitting Log AI. You can add it in My Account.",
      },
      guardian_permission_required: {
        title: "Guardian permission required",
        copy: "A parent or legal guardian must confirm permission before you can use Hitting Log AI.",
      },
      ai_age_restricted: {
        title: "Hitting Log AI is available for ages 13+",
        copy: "You can continue using the rest of The Hitting Log with a parent or legal guardian managing the account.",
      },
    }[code] || {
      title: "Confirm your eligibility",
      copy: serverMessage || "Update your account information before using Hitting Log AI.",
    };
    card.append(icon, createElement("h3", "", content.title), createElement("p", "", serverMessage || content.copy));
    const destination = actionUrl || (code === "ai_age_restricted" ? "" : "/account.html#profile-date-of-birth-input");
    if (destination) {
      const link = createElement("a", "hitting-ai-upgrade-link", "Go to My Account");
      link.href = destination;
      card.appendChild(link);
    }
    conversation.appendChild(card);
    setSending(false);
  }

  function renderStatus(message) {
    conversation.replaceChildren(createElement("p", "hitting-ai-panel-status", message));
  }

  async function checkAccess() {
    renderStatus("Checking your membership…");
    try {
      await window.hittingLogDataReady;
      const eligibility = window.hittingLogAgeEligibility?.getAiEligibility(window.getHittingLogProfile?.() || {});
      if (eligibility && !eligibility.eligible) {
        renderEligibilityGate(eligibility.code);
        return;
      }
      const membership = await window.hittingLogMembership?.loadStatus({ force: true });
      if (!membership) throw new Error("We couldn’t verify your membership.");
      isPro = membership.entitlements.ai === true;
      if (!isPro) {
        renderUpgrade();
        return;
      }
      conversation.replaceChildren();
      setSending(false);
      renderStarters();
      input.focus();
    } catch (error) {
      isPro = null;
      renderStatus(error.message || "We couldn’t verify your membership. Please try again.");
      setSending(false);
    }
  }

  function openPanel() {
    isOpen = true;
    panel.hidden = false;
    overlay.hidden = false;
    document.body.classList.add("has-hitting-ai-panel");
    window.requestAnimationFrame(() => {
      panel.classList.add("is-open");
      overlay.classList.add("is-open");
    });
    accessButton.setAttribute("aria-expanded", "true");
    if (isPro === null) checkAccess();
    else if (isPro) input.focus();
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove("is-open");
    overlay.classList.remove("is-open");
    document.body.classList.remove("has-hitting-ai-panel");
    accessButton.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      if (!isOpen) {
        panel.hidden = true;
        overlay.hidden = true;
      }
    }, 220);
    accessButton.focus();
  }

  async function sendQuestion(message) {
    const priorHistory = messages.slice(-6);
    messages.push({ role: "user", content: message });
    conversation.querySelector(".hitting-ai-starters")?.remove();
    appendMessage("user", message);
    const loading = appendMessage("assistant", "Analyzing your hitting data…");
    setSending(true);
    try {
      const session = await getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch("/api/hitting-ai", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, history: priorHistory }),
      });
      const data = await response.json().catch(() => ({}));
      loading.remove();
      if (response.status === 403 && ["date_of_birth_required", "guardian_permission_required", "ai_age_restricted"].includes(data.code)) {
        renderEligibilityGate(data.code, data.error, data.actionUrl);
        return;
      }
      if (response.status === 402 || data.code === "upgrade_required") {
        isPro = false;
        renderUpgrade();
        return;
      }
      if (!response.ok) throw new Error(data.error || "The AI Hitting Assistant couldn’t answer that question.");
      const answer = String(data.answer || "I couldn’t generate an answer. Please try again.");
      if (data.athleteName) athleteName.textContent = data.athleteName;
      messages.push({ role: "assistant", content: answer });
      appendMessage("assistant", answer);
    } catch (error) {
      loading.remove();
      appendMessage("assistant", error.message || "Something went wrong. Please try again.", { error: true });
    } finally {
      setSending(false);
      if (isPro) input.focus();
    }
  }

  function buildChat() {
    accessButton = createElement("button", "hitting-ai-access-button");
    accessButton.type = "button";
    accessButton.setAttribute("aria-controls", "hitting-ai-panel");
    accessButton.setAttribute("aria-expanded", "false");
    accessButton.innerHTML = '<span aria-hidden="true">✦</span><span>AI Hitting Assistant</span>';

    overlay = createElement("div", "hitting-ai-overlay");
    overlay.hidden = true;
    overlay.addEventListener("click", closePanel);

    panel = createElement("aside", "hitting-ai-panel");
    panel.id = "hitting-ai-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-labelledby", "hitting-ai-title");

    const header = createElement("header", "hitting-ai-header");
    const heading = createElement("div", "hitting-ai-heading");
    const eyebrow = createElement("p", "hitting-ai-eyebrow", "✦ PERFORMANCE ANALYSIS");
    const title = createElement("h2", "", "AI Hitting Assistant");
    title.id = "hitting-ai-title";
    athleteName = createElement("strong", "hitting-ai-athlete", window.getHittingLogProfile?.()?.athleteName || "Your hitter");
    heading.append(eyebrow, title, athleteName, createElement("p", "hitting-ai-description", "Ask questions about this hitter’s statistics."));
    const closeButton = createElement("button", "hitting-ai-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close AI Hitting Assistant");
    closeButton.addEventListener("click", closePanel);
    header.append(heading, closeButton);

    conversation = createElement("div", "hitting-ai-conversation");
    conversation.setAttribute("aria-live", "polite");
    form = createElement("form", "hitting-ai-form");
    input = document.createElement("textarea");
    input.className = "hitting-ai-input";
    input.placeholder = "Ask about your performance, trends, or what to work on…";
    input.maxLength = 500;
    input.rows = 2;
    input.setAttribute("aria-label", "Ask the AI Hitting Assistant a question");
    sendButton = createElement("button", "hitting-ai-send", "Send");
    sendButton.type = "submit";
    sendButton.disabled = true;
    input.addEventListener("input", () => {
      sendButton.disabled = isSending || isPro !== true || !input.value.trim();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!sendButton.disabled) form.requestSubmit();
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message || isSending || isPro !== true) return;
      input.value = "";
      sendQuestion(message);
    });
    form.append(input, sendButton);
    panel.append(header, conversation, form);
    document.body.append(accessButton, overlay, panel);
    accessButton.addEventListener("click", openPanel);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen) closePanel();
    });
  }

  document.addEventListener("DOMContentLoaded", buildChat);
})();
