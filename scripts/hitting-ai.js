(function () {
  const STARTERS = [
    "What count am I hitting best in?",
    "What velocity do I struggle with?",
    "Where am I getting most of my hits?",
    "What should I know about my last 20 at-bats?",
  ];
  const UPGRADE_MESSAGE = "AI Hitting Insights is available with a paid Hitting Log membership. Upgrade to ask questions about your hitting data and uncover deeper performance trends.";
  const PAID_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);
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
    card.appendChild(createElement("h3", "", "Unlock AI Hitting Insights"));
    card.appendChild(createElement("p", "", UPGRADE_MESSAGE));
    const link = createElement("a", "hitting-ai-upgrade-link", "View membership options");
    link.href = "/account";
    card.appendChild(link);
    conversation.appendChild(card);
    setSending(false);
  }

  function renderStatus(message) {
    conversation.replaceChildren(createElement("p", "hitting-ai-panel-status", message));
  }

  async function checkAccess() {
    renderStatus("Checking your membership…");
    try {
      const session = await getSession();
      if (!session?.access_token) {
        window.location.href = "/login";
        return;
      }
      const response = await fetch("/api/subscription-status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "We couldn’t verify your membership.");
      isPro = data.plan === "pro" && PAID_STATUSES.has(data.status);
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
      if (response.status === 402 || data.code === "upgrade_required") {
        isPro = false;
        renderUpgrade();
        return;
      }
      if (!response.ok) throw new Error(data.error || "Hitting AI couldn’t answer that question.");
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
    accessButton.innerHTML = '<span aria-hidden="true">✦</span><span>Ask Hitting AI</span>';

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
    const eyebrow = createElement("p", "hitting-ai-eyebrow", "✦ AI HITTING INSIGHTS");
    const title = createElement("h2", "", "Hitting AI");
    title.id = "hitting-ai-title";
    athleteName = createElement("strong", "hitting-ai-athlete", window.getHittingLogProfile?.()?.athleteName || "Your hitter");
    heading.append(eyebrow, title, athleteName, createElement("p", "hitting-ai-description", "Ask questions about this hitter’s statistics."));
    const closeButton = createElement("button", "hitting-ai-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close Hitting AI");
    closeButton.addEventListener("click", closePanel);
    header.append(heading, closeButton);

    conversation = createElement("div", "hitting-ai-conversation");
    conversation.setAttribute("aria-live", "polite");
    form = createElement("form", "hitting-ai-form");
    input = document.createElement("textarea");
    input.className = "hitting-ai-input";
    input.placeholder = "Ask about counts, velocity, zones, or recent at-bats…";
    input.maxLength = 500;
    input.rows = 2;
    input.setAttribute("aria-label", "Ask Hitting AI a question");
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
