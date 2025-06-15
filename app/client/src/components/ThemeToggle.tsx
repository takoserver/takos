import { createSignal, onMount } from "solid-js";

export default function ThemeToggle() {
  const [dark, setDark] = createSignal(true);

  onMount(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light") {
      setDark(false);
      document.documentElement.classList.remove("dark");
    }
  });

  const toggle = () => {
    const next = !dark();
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      type="button"
      class="p-2 rounded hover:bg-gray-700/70"
      aria-label="toggle theme"
      onClick={toggle}
    >
      {dark()
        ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3v1m0 16v1m8.66-8.66h-1m-16 0H3m15.07 6.07l-.71-.71M6.64 6.64l-.71-.71m0 12.73l.71-.71M17.36 6.64l.71-.71M12 8a4 4 0 100 8 4 4 0 000-8z"
            />
          </svg>
        )
        : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
            />
          </svg>
        )}
    </button>
  );
}
