(function () {
  const PUBLIC_SIGNUP_ENABLED = true;

  async function getClient() {
    const client = await window.hittingLogSupabaseReady;

    if (!client) {
      throw new Error("Supabase authentication is not configured yet.");
    }

    return client;
  }

  async function signUp({ email, password, options } = {}) {
    if (!PUBLIC_SIGNUP_ENABLED) {
      return {
        data: null,
        error: new Error("Account creation is temporarily unavailable."),
      };
    }

    const client = await getClient();
    return client.auth.signUp({
      email,
      password,
      options,
    });
  }

  async function logIn({ email, password } = {}) {
    const client = await getClient();
    return client.auth.signInWithPassword({
      email,
      password,
    });
  }

  async function logOut() {
    const client = await getClient();
    return client.auth.signOut();
  }

  async function getCurrentSession() {
    const client = await getClient();
    return client.auth.getSession();
  }

  async function requestPasswordReset({ email, redirectTo } = {}) {
    const client = await getClient();
    return client.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async function updatePassword(password) {
    const client = await getClient();
    return client.auth.updateUser({ password });
  }

  async function onAuthStateChange(callback) {
    const client = await getClient();
    return client.auth.onAuthStateChange(callback);
  }

  window.hittingLogAuth = {
    PUBLIC_SIGNUP_ENABLED,
    signUp,
    logIn,
    logOut,
    getCurrentSession,
    requestPasswordReset,
    updatePassword,
    onAuthStateChange,
  };
})();
