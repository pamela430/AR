(() => {
  const form = document.querySelector("#login");
  const message = document.querySelector("#form-message");
  const passwordInput = document.querySelector("#pwd_id");
  const visibilityButton = document.querySelector("#visibilityBtn");

  const getCookie = (name) => document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`))
    ?.split("=")[1];

  const setMessage = (text, isError = true) => {
    message.textContent = text;
    message.setAttribute("role", isError ? "alert" : "status");
  };

  const initializeCsrf = async () => {
    const response = await fetch("/api/csrf", { credentials: "same-origin" });
    if (!response.ok) throw new Error("csrf");
  };

  visibilityButton?.addEventListener("click", () => {
    const isPassword = passwordInput.type === "password";
    passwordInput.type = isPassword ? "text" : "password";
    visibilityButton.setAttribute("aria-label", isPassword ? "Masquer le mot de passe" : "Afficher le mot de passe");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (event.nativeEvent?.isComposing || event.keyCode === 229) return;
    setMessage("Connexion en cours…", false);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": decodeURIComponent(getCookie("csrf_token") || ""),
        },
        body: JSON.stringify({
          ide: form.ide.value,
          pwd: form.pwd.value,
          persistent: form.persistent.checked,
        }),
      });
      const result = await response.json();
      setMessage(result.error || "Une erreur est survenue.");
    } catch {
      setMessage("Impossible de contacter le serveur. Réessayez.");
    }
  });

  initializeCsrf().catch(() => setMessage("Le formulaire n’est pas disponible pour le moment."));
})();
