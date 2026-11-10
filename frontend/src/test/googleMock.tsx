/**
 * Reemplazo de @react-oauth/google para tests: el popup real de Google no funciona en jsdom.
 * El botón simula un login exitoso con la credencial "cred-de-google".
 */
export const googleMock = {
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GoogleLogin: ({
    onSuccess,
    onError,
  }: {
    onSuccess: (r: { credential?: string }) => void;
    onError?: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSuccess({ credential: 'cred-de-google' })}>
        Google (mock)
      </button>
      <button type="button" onClick={() => onError?.()}>
        Google falla (mock)
      </button>
    </div>
  ),
};
