"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require.resolve("../scripts/stripe-checkout.js"), "utf8");
const accountSource = fs.readFileSync(require.resolve("../account.html"), "utf8");

function createElement({ dataset = {} } = {}) {
  const listeners = new Map();
  const classes = new Set();
  const attributes = new Map();
  return {
    tagName: "BUTTON",
    dataset,
    textContent: "",
    hidden: false,
    disabled: false,
    classList: {
      toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    getAttribute(name) { return attributes.get(name) || null; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    click() { if (!this.disabled && !this.hidden) listeners.get("click")?.({ target: this }); },
    querySelector() { return null; },
  };
}

function createResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(body); },
  };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function renderScenario(billingState, postResponse = { status: 200, body: { url: "https://checkout.stripe.test/session" } }) {
  const domReadyListeners = [];
  const billingButton = createElement();
  billingButton.hidden = true;
  billingButton.disabled = true;
  billingButton.textContent = "Manage Subscription";
  const billingMessage = createElement();
  const billingCopy = createElement();
  const planValue = createElement();
  const gameAccessValue = createElement();
  const subscriptionValue = createElement();
  const billingValue = createElement();
  const cards = ["free", "pro", "pro_plus"].map((plan) => {
    const card = createElement({ dataset: { membershipCard: plan } });
    card.tagName = "ARTICLE";
    const label = createElement();
    label.hidden = true;
    const action = plan === "free" ? null : createElement({ dataset: { planAction: plan } });
    card.querySelector = (selector) => {
      if (selector === "[data-current-plan-label]") return label;
      if (selector === "[data-plan-action]") return action;
      return null;
    };
    card.currentLabel = label;
    card.planAction = action;
    return card;
  });
  const proButton = cards[1].planAction;
  const proPlusButton = cards[2].planAction;
  const elements = {
    "upgrade-button": billingButton,
    "account-plan-value": planValue,
    "account-game-access-value": gameAccessValue,
    "account-subscription-value": subscriptionValue,
    "account-billing-value": billingValue,
    "billing-section-copy": billingCopy,
    "billing-message": billingMessage,
  };
  const requests = [];
  const context = {
    console: { info() {}, error() {} },
    URLSearchParams,
    document: {
      addEventListener(type, listener) { if (type === "DOMContentLoaded") domReadyListeners.push(listener); },
      getElementById(id) { return elements[id] || null; },
      querySelectorAll(selector) {
        if (selector === "[data-membership-card]") return cards;
        if (selector === "[data-plan-action]") return [proButton, proPlusButton];
        return [];
      },
    },
    fetch: async (url, options = {}) => {
      requests.push({ url, options });
      return options.method === "POST"
        ? createResponse(postResponse.status, postResponse.body)
        : createResponse(200, billingState);
    },
    window: {
      location: { search: "", href: "" },
      setTimeout,
      hittingLogAuth: {
        async getCurrentSession() {
          return { data: { session: { access_token: "token", user: { id: "user-1" } } }, error: null };
        },
      },
      hittingLogMembership: {
        normalizeState(state) { return state; },
      },
    },
  };

  vm.runInNewContext(source, context, { filename: "scripts/stripe-checkout.js" });
  domReadyListeners.forEach((listener) => listener());
  await flush();
  return { billingButton, proButton, proPlusButton, billingMessage, cards, requests, window: context.window };
}

const freeState = { plan: "free", status: "inactive", subscription: null, displayName: "Free" };
const formerPaidFreeState = {
  plan: "free",
  status: "canceled",
  subscription: { hasStripeCustomer: true },
  displayName: "Free",
};
const proState = { plan: "pro", status: "active", subscription: { hasStripeCustomer: true }, displayName: "Pro" };
const proPlusState = { plan: "pro_plus", status: "active", subscription: { hasStripeCustomer: true }, displayName: "Pro Plus" };
const trialingState = { plan: "pro", status: "trialing", subscription: { hasStripeCustomer: true }, displayName: "Pro" };

(async () => {
  assert.equal(accountSource.includes("membership-plan-action"), false, "old visible plan buttons must be removed");
  assert.equal(accountSource.includes("class=\"membership-plan-card-action\""), true, "cards must use native button controls");

  let scenario = await renderScenario(freeState);
  assert.equal(scenario.billingButton.hidden, false);
  assert.equal(scenario.billingButton.disabled, false);
  assert.equal(scenario.proButton.disabled, false);
  assert.equal(scenario.proPlusButton.disabled, false);
  assert.equal(scenario.cards[0].classList.contains("is-current"), true);
  assert.equal(scenario.cards[0].querySelector("[data-plan-action]"), null, "Free must not be an immediate downgrade action");
  assert.equal(scenario.cards[1].classList.contains("is-selectable"), true);
  assert.equal(scenario.cards[2].classList.contains("is-selectable"), true);
  assert.equal(scenario.proButton.tagName, "BUTTON", "selectable cards must use a native keyboard control");

  scenario.proButton.click();
  assert.equal(scenario.cards[1].classList.contains("is-loading"), true);
  assert.equal(scenario.proPlusButton.disabled, true, "all plan actions must lock while Stripe opens");
  scenario.proButton.click();
  await flush();
  let posts = scenario.requests.filter((request) => request.options.method === "POST");
  assert.equal(posts.length, 1, "rapid clicks must create only one Stripe request");
  assert.equal(posts[0].url, "/api/create-checkout-session");
  assert.deepEqual(JSON.parse(posts[0].options.body), { plan: "pro" });

  scenario = await renderScenario(formerPaidFreeState);
  scenario.billingButton.click();
  await flush();
  posts = scenario.requests.filter((request) => request.options.method === "POST");
  assert.equal(posts[0].url, "/api/create-portal-session", "former paid users must retain portal access");

  scenario = await renderScenario(freeState);
  scenario.proPlusButton.click();
  await flush();
  posts = scenario.requests.filter((request) => request.options.method === "POST");
  assert.equal(posts[0].url, "/api/create-checkout-session");
  assert.deepEqual(JSON.parse(posts[0].options.body), { plan: "pro_plus" });

  scenario = await renderScenario(freeState);
  scenario.billingButton.click();
  await flush();
  posts = scenario.requests.filter((request) => request.options.method === "POST");
  assert.equal(posts[0].url, "/api/create-checkout-session");
  assert.deepEqual(JSON.parse(posts[0].options.body), { plan: "pro" });

  for (const state of [proState, proPlusState, trialingState]) {
    scenario = await renderScenario(state);
    assert.equal(scenario.billingButton.hidden, false);
    scenario.billingButton.click();
    await flush();
    posts = scenario.requests.filter((request) => request.options.method === "POST");
    assert.equal(posts[0].url, "/api/create-portal-session");
  }

  scenario = await renderScenario(proState);
  assert.equal(scenario.proButton.disabled, true);
  assert.equal(scenario.proButton.hidden, true);
  assert.equal(scenario.cards[1].getAttribute("aria-current"), "true");
  assert.equal(scenario.cards[1].currentLabel.hidden, false);
  scenario.proButton.click();
  await flush();
  assert.equal(scenario.requests.filter((request) => request.options.method === "POST").length, 0);
  assert.equal(scenario.proPlusButton.disabled, false);
  scenario.proPlusButton.click();
  await flush();
  posts = scenario.requests.filter((request) => request.options.method === "POST");
  assert.equal(posts[0].url, "/api/create-portal-session", "paid tier changes must use Stripe Portal");

  scenario = await renderScenario(proPlusState);
  scenario.proButton.click();
  await flush();
  posts = scenario.requests.filter((request) => request.options.method === "POST");
  assert.equal(posts[0].url, "/api/create-portal-session", "paid downgrades must not create another Checkout subscription");

  scenario = await renderScenario(freeState, { status: 500, body: { error: "Stripe is unavailable." } });
  scenario.proButton.click();
  await flush();
  assert.equal(scenario.proButton.disabled, false);
  assert.equal(scenario.proPlusButton.disabled, false);
  assert.equal(scenario.billingButton.disabled, false);
  assert.equal(scenario.cards[1].classList.contains("is-loading"), false);
  assert.equal(scenario.billingMessage.textContent, "Stripe is unavailable.");

  console.log("Stripe Account UI tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
