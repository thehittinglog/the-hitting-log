(function () {
  // Change this flag only when public account creation is ready to launch.
  // Until then, no public form should call Supabase Auth signUp.
  const PUBLIC_SIGNUP_ENABLED = false;
  const signupClosedMessage = "Account creation is not open yet. Join the waitlist for early access.";

  function getClient() {
    const client = window.hittingLogSupabase?.getClient();

    if (!client) {
      throw new Error("Supabase authentication is not configured yet.");
    }

    return client;
  }

  async function signUp({ email, password, options } = {}) {
    if (!PUBLIC_SIGNUP_ENABLED) {
      return {
        data: null,
        error: new Error(signupClosedMessage),
      };
    }

    return getClient().auth.signUp({
      email,
      password,
      options,
    });
  }

  async function logIn({ email, password } = {}) {
    return getClient().auth.signInWithPassword({
      email,
      password,
    });
  }

  async function logOut() {
    return getClient().auth.signOut();
  }

  async function getCurrentSession() {
    return getClient().auth.getSession();
  }

  window.hittingLogAuth = {
    PUBLIC_SIGNUP_ENABLED,
    signupClosedMessage,
    signUp,
    logIn,
    logOut,
    getCurrentSession,
  };
})();
