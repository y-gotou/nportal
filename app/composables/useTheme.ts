export function useTheme() {
  const isDark = useState<boolean>("theme", () => false);

  function apply(dark: boolean) {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }

  function toggleTheme() {
    isDark.value = !isDark.value;
    if (import.meta.client) apply(isDark.value);
  }

  function initTheme() {
    if (!import.meta.client) return;
    const dark = localStorage.getItem("theme") === "dark";
    isDark.value = dark;
    document.documentElement.classList.toggle("dark", dark);
  }

  return { isDark, toggleTheme, initTheme };
}
