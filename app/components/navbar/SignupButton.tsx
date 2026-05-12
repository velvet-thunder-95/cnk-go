'use client';
export default function SignupButton() {
  function handleSignup() {
    // TODO: Signup Logic
  }
  return (
    <>
      <button
        onClick={handleSignup}
        className="rounded-lg bg-(--color-blue) px-6 py-2 text-lg text-white"
      >
        Sign In
      </button>
    </>
  );
}
