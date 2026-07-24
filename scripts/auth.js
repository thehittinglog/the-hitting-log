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
    console.info("[Signup][Auth] Supabase signUp request started");

    const result = await client.auth.signUp({
      email,
      password,
      options,
    });

    console.info("[Signup][Auth] Supabase signUp response", {
      userId: result.data?.user?.id || null,
      hasSession: Boolean(result.data?.session),
      authError: result.error
        ? {
            message: result.error.message,
            status: result.error.status,
            code: result.error.code,
            name: result.error.name,
          }
        : null,
    });

    if (result.error) {
      console.error("[Signup][Auth] Supabase signUp failed", {
        message: result.error.message,
        status: result.error.status,
        code: result.error.code,
        name: result.error.name,
        error: result.error,
      });
    }

    return result;
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

  async function updateProfile(data) {
    const client = await getClient();
    return client.auth.updateUser({ data });
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
    updateProfile,
    onAuthStateChange,
  };
})();
