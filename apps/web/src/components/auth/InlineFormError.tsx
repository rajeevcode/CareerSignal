/**
 * Field-level inline error. Render right after the input and wire it up with
 * `aria-describedby={id}` + `aria-invalid` on the input so screen readers
 * announce the message (replaces browser-native validation tooltips).
 */
export function InlineFormError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-risk">
      {message}
    </p>
  );
}
