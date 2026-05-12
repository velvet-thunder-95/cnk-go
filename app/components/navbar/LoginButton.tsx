'use client';
export default function LoginButton() {
  function handleLogin() {
    // TODO: Login Logic
  }
  return (
    <>
      <button onClick={handleLogin} className="text-lg text-(--color-blue)">
        Log In
      </button>
    </>
  );
}
